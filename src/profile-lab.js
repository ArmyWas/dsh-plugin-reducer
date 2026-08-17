import { createHash } from 'node:crypto'
import { access, copyFile, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'

const PROFILE_PATCH = 'cordis.patch.yml'

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
function validateProfileName(name) {
  if (typeof name !== 'string' || name === '' || name === '.' || name === '..'
    || name === 'node_modules' || name.includes('/') || name.includes('\\')) {
    throw new Error(`invalid DSH profile name: ${JSON.stringify(name)}`)
  }
}

async function readJson(path, label) {
  let raw
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    throw new Error(`cannot read ${label} at ${path}: ${error.message}`)
  }
  try {
    return { raw, value: JSON.parse(raw) }
  } catch (error) {
    throw new Error(`invalid JSON in ${label} at ${path}: ${error.message}`)
  }
}

function resolvePackageDirectory(profileManifestPath, packageName) {
  const require = createRequire(profileManifestPath)
  for (const searchPath of require.resolve.paths(packageName) ?? []) {
    const candidate = join(searchPath, packageName)
    try {
      require.resolve(join(candidate, 'package.json'))
      return candidate
    } catch {
      // Some packages do not export package.json. The file check below is the
      // authoritative path, matching DSH's own two-anchor package lookup.
    }
  }
  return undefined
}

async function packageInfo(profileManifestPath, packageName, spec) {
  const directory = resolvePackageDirectory(profileManifestPath, packageName)
  if (directory === undefined) return { name: packageName, spec, version: null, resolved: false }
  try {
    const { value } = await readJson(join(directory, 'package.json'), `package ${packageName}`)
    return {
      name: packageName,
      spec,
      version: typeof value.version === 'string' ? value.version : null,
      resolved: true,
    }
  } catch {
    return { name: packageName, spec, version: null, resolved: true }
  }
}

export function resolveDshHome(explicitHome) {
  return resolve(explicitHome ?? process.env.DSH_HOME ?? join(homedir(), '.dsh'))
}

export async function profileFingerprint(profileDirectory, dshHome) {
  const hash = createHash('sha256')
  for (const path of [
    join(profileDirectory, 'package.json'),
    join(profileDirectory, PROFILE_PATCH),
    join(dshHome, PROFILE_PATCH),
  ]) {
    hash.update(basename(path))
    if (await exists(path)) hash.update(await readFile(path))
  }
  return hash.digest('hex')
}

export async function inspectProfile({ dshHome: explicitHome, profile }) {
  validateProfileName(profile)
  const dshHome = resolveDshHome(explicitHome)
  const profileDirectory = join(dshHome, 'profiles', profile)
  const manifestPath = join(profileDirectory, 'package.json')
  const { value: manifest } = await readJson(manifestPath, `profile ${profile}`)
  const bundles = manifest?.dsh?.profile?.bundles
  if (!Array.isArray(bundles) || bundles.some(bundle => typeof bundle !== 'string')) {
    throw new Error(`profile ${profile} has no valid dsh.profile.bundles array`)
  }
  if (new Set(bundles).size !== bundles.length) {
    throw new Error(`profile ${profile} contains duplicate bundle names`)
  }
  const dependencies = manifest.dependencies ?? {}
  if (dependencies === null || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
    throw new Error(`profile ${profile} has an invalid dependencies object`)
  }

  // `dsh plugin` records every out-of-tree bundle as both a dependency and a
  // bundle layer. Installation-owned bundles are layers but not dependencies.
  const candidates = bundles.filter(bundle => Object.hasOwn(dependencies, bundle))
  const fixedBundles = bundles.filter(bundle => !Object.hasOwn(dependencies, bundle))
  const packages = await Promise.all(candidates.map(bundle => packageInfo(
    manifestPath,
    bundle,
    String(dependencies[bundle]),
  )))

  return {
    dshHome,
    profile,
    profileDirectory,
    manifestPath,
    manifest,
    bundles: [...bundles],
    candidates,
    fixedBundles,
    packages,
    fingerprint: await profileFingerprint(profileDirectory, dshHome),
  }
}

async function copyIfPresent(source, target) {
  if (!await exists(source)) return false
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
  return true
}

export async function createShadowLab(profileInfo, { keep = false } = {}) {
  const prefix = join(tmpdir(), `dsh-plugin-reducer-${profileInfo.profile}-`)
  const root = await mkdtemp(prefix)
  const shadowProfileDirectory = join(root, 'profiles', profileInfo.profile)
  await mkdir(shadowProfileDirectory, { recursive: true })

  await copyIfPresent(
    join(profileInfo.profileDirectory, PROFILE_PATCH),
    join(shadowProfileDirectory, PROFILE_PATCH),
  )
  await copyIfPresent(
    join(profileInfo.profileDirectory, 'pnpm-workspace.yaml'),
    join(shadowProfileDirectory, 'pnpm-workspace.yaml'),
  )
  await copyIfPresent(join(profileInfo.dshHome, PROFILE_PATCH), join(root, PROFILE_PATCH))
  await copyIfPresent(join(profileInfo.dshHome, 'settings.yaml'), join(root, 'settings.yaml'))

  const sourceModules = join(profileInfo.profileDirectory, 'node_modules')
  const shadowModules = join(shadowProfileDirectory, 'node_modules')
  let modulesLinked = false
  if (await exists(sourceModules)) {
    await symlink(sourceModules, shadowModules, process.platform === 'win32' ? 'junction' : 'dir')
    modulesLinked = true
  } else if (profileInfo.candidates.length > 0) {
    throw new Error(`profile has plugin dependencies but no node_modules directory: ${sourceModules}`)
  }

  const activeSet = new Set(profileInfo.candidates)
  const writeBundles = async activeCandidates => {
    const requested = new Set(activeCandidates)
    for (const candidate of requested) {
      if (!activeSet.has(candidate)) throw new Error(`unknown candidate bundle: ${candidate}`)
    }
    const bundles = profileInfo.bundles.filter(bundle => (
      !activeSet.has(bundle) || requested.has(bundle)
    ))
    const manifest = structuredClone(profileInfo.manifest)
    manifest.dsh = {
      ...manifest.dsh,
      profile: { ...manifest.dsh?.profile, bundles },
    }
    await writeFile(
      join(shadowProfileDirectory, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    )
    return bundles
  }

  await writeBundles(profileInfo.candidates)

  let disposed = false
  const dispose = async () => {
    if (disposed || keep) return
    disposed = true
    if (modulesLinked && await exists(shadowModules)) await unlink(shadowModules)
    await rm(root, { recursive: true, force: true })
  }

  return {
    root,
    profileDirectory: shadowProfileDirectory,
    writeBundles,
    dispose,
    keep,
  }
}
