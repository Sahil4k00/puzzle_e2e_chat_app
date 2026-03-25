import * as inviteService from "../services/inviteService.js";

export async function createInvite(req, res, next) {
  try {
    const invite = await inviteService.createInvite({
      userId: req.user._id,
      ...req.body
    });
    res.status(201).json(invite);
  } catch (error) {
    next(error);
  }
}

export async function getPublicInvite(req, res, next) {
  try {
    const invite = await inviteService.getPublicInvite(req.params.code);
    res.json(invite);
  } catch (error) {
    next(error);
  }
}

export async function validateInvite(req, res, next) {
  try {
    const result = await inviteService.validateInvite({
      code: req.params.code,
      answer: req.body.answer,
      userId: req.user._id
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}