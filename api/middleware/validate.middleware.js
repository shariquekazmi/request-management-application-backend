export const validate = (schema) => {
  return (req, res, next) => {
    const data = { ...req.body, ...req.params, ...req.query };

    const { error } = schema.validate(data, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        error: error.details.map((d) => d.message),
      });
    }

    next();
  };
};
