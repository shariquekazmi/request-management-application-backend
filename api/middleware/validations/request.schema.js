import Joi from "joi";

export const createRequestSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  assigned_to: Joi.number().required(),
});

export const updateRequestSchema = Joi.object({
  id: Joi.number().required(),
  action: Joi.string().valid("approve", "reject", "action", "close").required(),
});

export const getRequestByIdSchema = Joi.object({
  id: Joi.number().required(),
});
