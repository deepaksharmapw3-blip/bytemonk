const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  countryCode: { type: String, required: true, match: /^\+\d{1,4}$/ },
  whatsapp: { type: String, required: true, match: /^\d{7,15}$/ },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  year: { type: String, required: true, trim: true, maxlength: 50 },
  interests: { type: [{ type: String, trim: true, maxlength: 80 }], required: true },
  customInterest: { type: String, trim: true, maxlength: 100, default: '' },
  skill: { type: String, required: true, enum: ['Beginner', 'Intermediate', 'Advanced'] },
  formats: { type: [{ type: String, enum: ['Hands-on workshops', 'Talks & seminars', 'Coding sessions', 'Project sprints', 'Peer learning circles'] }], required: true },
  timing: { type: String, required: true, enum: ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekend mornings', 'Weekend afternoons'] },
  goals: { type: String, trim: true, maxlength: 500, default: '' },
  suggestions: { type: String, trim: true, maxlength: 500, default: '' },
  consent: { type: Boolean, required: true, enum: [true] },
  consentAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false })

studentSchema.index({ email: 1 }, { unique: true })

module.exports = mongoose.model('Student', studentSchema)
