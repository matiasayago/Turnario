const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  start: {
    type: String,
    required: true,
    trim: true
  },
  end: {
    type: String,
    required: true,
    trim: true
  },
  isCustom: {
    type: Boolean,
    default: true
  }
}, {
  _id: false
});

const professionalDateScheduleSchema = new mongoose.Schema({
  professionalId: {
    type: String,
    required: true,
    trim: true
  },
  professionalName: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{4}-\d{2}-\d{2}$/.test(v);
      },
      message: 'La fecha debe estar en formato YYYY-MM-DD'
    }
  },
  timeSlots: [timeSlotSchema],
  isAvailable: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

professionalDateScheduleSchema.index({ professionalId: 1, date: 1 }, { unique: true });
professionalDateScheduleSchema.index({ professionalId: 1 });
professionalDateScheduleSchema.index({ date: 1 });
professionalDateScheduleSchema.index({ isAvailable: 1 });

professionalDateScheduleSchema.pre('save', function(next) {
  if (this.isAvailable && (!this.timeSlots || this.timeSlots.length === 0)) {
    return next(new Error('Debe haber al menos un horario si la fecha está disponible'));
  }
  next();
});

professionalDateScheduleSchema.statics.getMonthlySchedules = function(professionalId, year, month) {
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

  return this.find({
    professionalId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

professionalDateScheduleSchema.statics.getDateRangeSchedules = function(professionalId, startDate, endDate) {
  return this.find({
    professionalId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

module.exports = mongoose.model('ProfessionalDateSchedule', professionalDateScheduleSchema);
