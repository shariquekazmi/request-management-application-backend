import Joi from "joi";

export const signUpSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("EMPLOYEE", "MANAGER").required(),
  manager_id: Joi.number().when("role", {
    is: "EMPLOYEE",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});
