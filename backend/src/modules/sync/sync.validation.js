import Joi from 'joi';

const householdSchema = Joi.object({
    id: Joi.string().required(),
    projectId: Joi.string().required(),
    zoneId: Joi.string().required(),
    organizationId: Joi.string().required(),
    status: Joi.string().allow('', null),
    owner: Joi.any(),
    location: Joi.any(),
    koboData: Joi.any(),
    version: Joi.number().integer().min(0),
    updatedAt: Joi.any()
}).unknown(true);

const projectSchema = Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    organizationId: Joi.string().required(),
    status: Joi.string(),
    budget: Joi.any(),
    version: Joi.number().integer(),
}).unknown(true);

const zoneSchema = Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    projectId: Joi.string().required(),
    organizationId: Joi.string().required(),
}).unknown(true);

const teamSchema = Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
}).unknown(true);

export const pushSchema = Joi.object({
    changes: Joi.object({
        projects: Joi.array().items(projectSchema),
        zones: Joi.array().items(zoneSchema),
        households: Joi.array().items(householdSchema),
        teams: Joi.array().items(teamSchema)
    }).required()
});
