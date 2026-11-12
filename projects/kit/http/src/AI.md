# AI notes: API errors

- Every app: `withInterceptors([lenziErrorInterceptor])` and `provideLenziHttp({ problemTypePrefix })` matching its
  API's problem types.
- The API (Fastify) answers errors as Problem Details with `errors: [{ field, message }]` for validation.
- In a component, an error from a resource is `resource.error()`; show it with `couldNotLoad` /
  `describeError`, never `JSON.stringify`.
