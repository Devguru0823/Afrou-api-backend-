const mongoose = require('mongoose');
const { Schema } = mongoose
const Joi = require('joi');

const userSchema = Joi.object({
  user_id: Joi.number(),
  first_name: Joi.string().max(30).required(),
  last_name: Joi.string().max(30).required(),
  facebook_id: Joi.string(),
  google_id: Joi.string(),
  email: Joi.string().email(),
  password: Joi.string().alphanum().max(20),
  date_of_birth: Joi.date().required(),
  gender: Joi.string().required(),
  contact_Number: Joi.number(),
  about: Joi.string(),
  state: Joi.string().min(3).max(50),
  nationality: Joi.string().min(3).max(100),
  religion: Joi.string().min(3).max(30),
  profile_image_url: Joi.string().required().default('profile_default.jpg'),
  cover_image_url: Joi.string().required().default('cover_default.jpg'),
  sports_interests: Joi.array().items(Joi.string()),
  politics_interest: Joi.string().min(3).max(30),
  career_interest: Joi.string().min(3).max(30),
  friend_ids: Joi.array().items(Joi.number()),
  follower_ids: Joi.array().items(Joi.number()),
  following_ids: Joi.array().items(Joi.number()),
  private: Joi.boolean().required().default(false),
  firebase_token: Joi.string(),
  introduced: Joi.boolean().required().default(false),
  status: Joi.string().required().default('inactive'),
  created_date: Joi.date().required().default(new Date()),
  OtpDateTime: Joi.date().required().default(new Date()),
  updated_date: Joi.date(),
  last_active: Joi.date().default(new Date()),
  user_name: Joi.string().min(3).max(30),
  mostpopularpostseen: Joi.array().default([]),
  register_device_detail: Joi.array().default([]),
  login_device_detail: Joi.array().default()
})

module.exports = { userSchema };
