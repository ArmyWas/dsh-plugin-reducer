export function apply(ctx) {
  ctx.tools.register({
    name: 'dsh_reducer_fixture_collision',
    description: 'Intentional reducer integration fixture A.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: value => [{ type: 'text', text: value }],
    },
    async execute() { return 'a' },
  })
}
