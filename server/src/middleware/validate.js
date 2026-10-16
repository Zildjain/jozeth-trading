export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed.',
        details: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      });
    }
    req.validatedBody = parsed.data;
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid route parameter.' });
    req.validatedParams = parsed.data;
    next();
  };
}
