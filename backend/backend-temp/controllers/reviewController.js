const Review = require('../models/Review');
const Service = require('../models/Service');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../config/logger');

class ReviewController {
  /**
   * Obtener lista de reseñas con filtros
   */
  static async getReviews(req, res) {
    try {
      const {
        serviceId,
        professionalId,
        clientId,
        rating,
        isVerified,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };

      if (serviceId) filters.serviceId = serviceId;
      if (professionalId) filters.professionalId = professionalId;
      if (clientId) filters.clientId = clientId;
      if (rating) filters.rating = parseInt(rating);
      if (isVerified !== undefined) filters.isVerified = isVerified === 'true';

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find(filters)
          .populate('serviceId', 'name description price')
          .populate('professionalId', 'fullName email avatar professionalInfo')
          .populate('clientId', 'fullName email avatar')
          .populate('replies.professionalId', 'fullName email avatar')
          .sort(sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'rating' ? { rating: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'helpfulCount' ? { helpfulCount: sortOrder === 'desc' ? -1 : 1 } :
                { createdAt: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Review.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getReviews:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener reseña específica
   */
  static async getReviewById(req, res) {
    try {
      const review = await Review.findById(req.params.id)
        .populate('serviceId', 'name description price requirements')
        .populate('professionalId', 'fullName email avatar professionalInfo')
        .populate('clientId', 'fullName email avatar clientInfo')
        .populate('replies.professionalId', 'fullName email avatar');

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      res.json({
        success: true,
        data: review
      });

    } catch (error) {
      logger.error('Error in getReviewById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nueva reseña
   */
  static async createReview(req, res) {
    try {
      const {
        serviceId,
        professionalId,
        rating,
        title,
        comment,
        pros,
        cons,
        metadata = {}
      } = req.body;

      // Verificar que el servicio exista y esté activo
      const service = await Service.findById(serviceId);
      if (!service || !service.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Servicio no encontrado o inactivo'
        });
      }

      // Verificar que el profesional exista y esté activo
      const professional = await User.findById(professionalId);
      if (!professional || !professional.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Profesional no encontrado o inactivo'
        });
      }

      // Verificar que el cliente no se esté reseñando a sí mismo
      if (req.user._id.toString() === professionalId) {
        return res.status(400).json({
          success: false,
          message: 'No puedes reseñarte a ti mismo'
        });
      }

      // Verificar que no haya una reseña previa del mismo cliente para el mismo servicio
      const existingReview = await Review.findOne({
        serviceId,
        clientId: req.user._id,
        isDeleted: false
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'Ya has reseñado este servicio'
        });
      }

      // Validar rating
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'El rating debe estar entre 1 y 5'
        });
      }

      const reviewData = {
        serviceId,
        professionalId,
        clientId: req.user._id,
        rating,
        title,
        comment,
        pros,
        cons,
        isVerified: false,
        metadata,
        createdBy: req.user._id
      };

      const review = new Review(reviewData);
      await review.save();

      // Log de la acción
      review.logAccess(req.user._id, 'review_created', {
        serviceId,
        professionalId,
        rating
      });

      // Enviar notificación al profesional
      try {
        await Notification.create({
          recipientId: professionalId,
          senderId: req.user._id,
          type: 'review_received',
          title: 'Nueva reseña recibida',
          message: `${req.user.fullName} ha dejado una reseña de ${rating} estrellas para tu servicio`,
          priority: 'normal',
          metadata: {
            reviewId: review._id,
            serviceId,
            rating
          }
        });
      } catch (notificationError) {
        logger.error('Error sending notification:', notificationError);
      }

      // Populate para la respuesta
      const createdReview = await Review.findById(review._id)
        .populate('serviceId', 'name description price')
        .populate('professionalId', 'fullName email avatar professionalInfo')
        .populate('clientId', 'fullName email avatar');

      res.status(201).json({
        success: true,
        message: 'Reseña creada exitosamente',
        data: createdReview
      });

    } catch (error) {
      logger.error('Error in createReview:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar reseña
   */
  static async updateReview(req, res) {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      // Verificar que el usuario autenticado sea el autor de la reseña
      if (review.clientId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para modificar esta reseña'
        });
      }

      const {
        rating,
        title,
        comment,
        pros,
        cons,
        metadata
      } = req.body;

      // Validar rating si se está actualizando
      if (rating !== undefined && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          message: 'El rating debe estar entre 1 y 5'
        });
      }

      // Actualizar campos permitidos
      const updateFields = ['rating', 'title', 'comment', 'pros', 'cons', 'metadata'];
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          review[field] = req.body[field];
        }
      });

      review.lastModifiedBy = req.user._id;
      review.lastModifiedAt = new Date();
      await review.save();

      // Log de la acción
      review.logAccess(req.user._id, 'review_updated', {
        changes: req.body
      });

      // Populate para la respuesta
      const updatedReview = await Review.findById(req.params.id)
        .populate('serviceId', 'name description price')
        .populate('professionalId', 'fullName email avatar professionalInfo')
        .populate('clientId', 'fullName email avatar');

      res.json({
        success: true,
        message: 'Reseña actualizada exitosamente',
        data: updatedReview
      });

    } catch (error) {
      logger.error('Error in updateReview:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar reseña (soft delete)
   */
  static async deleteReview(req, res) {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      // Verificar permisos
      const canDelete = req.user._id.toString() === review.clientId.toString() ||
                       req.user.userType === 'admin';

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar esta reseña'
        });
      }

      review.isDeleted = true;
      review.deletedAt = new Date();
      review.deletedBy = req.user._id;
      review.lastModifiedBy = req.user._id;
      review.lastModifiedAt = new Date();
      await review.save();

      // Log de la acción
      review.logAccess(req.user._id, 'review_deleted');

      res.json({
        success: true,
        message: 'Reseña eliminada exitosamente',
        data: {
          reviewId: review._id
        }
      });

    } catch (error) {
      logger.error('Error in deleteReview:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Marcar reseña como útil
   */
  static async markAsHelpful(req, res) {
    try {
      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      // Verificar que el usuario no sea el autor de la reseña
      if (review.clientId.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'No puedes marcar tu propia reseña como útil'
        });
      }

      // Verificar si ya fue marcada como útil
      const helpfulIndex = review.helpfulBy.indexOf(req.user._id);
      
      if (helpfulIndex > -1) {
        // Remover de útil
        review.helpfulBy.splice(helpfulIndex, 1);
        review.helpfulCount = Math.max(0, review.helpfulCount - 1);
      } else {
        // Agregar como útil
        review.helpfulBy.push(req.user._id);
        review.helpfulCount += 1;
      }

      review.lastModifiedBy = req.user._id;
      review.lastModifiedAt = new Date();
      await review.save();

      // Log de la acción
      review.logAccess(req.user._id, 'review_helpful_toggled', {
        isHelpful: helpfulIndex === -1
      });

      res.json({
        success: true,
        message: helpfulIndex > -1 ? 'Reseña removida de útiles' : 'Reseña marcada como útil',
        data: {
          reviewId: review._id,
          helpfulCount: review.helpfulCount,
          isHelpful: helpfulIndex === -1
        }
      });

    } catch (error) {
      logger.error('Error in markAsHelpful:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Responder a una reseña (solo profesionales)
   */
  static async replyToReview(req, res) {
    try {
      const { comment } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      // Verificar que el usuario autenticado sea el profesional de la reseña
      if (review.professionalId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Solo el profesional puede responder a esta reseña'
        });
      }

      // Verificar que no haya una respuesta previa
      if (review.replies && review.replies.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya has respondido a esta reseña'
        });
      }

      const reply = {
        professionalId: req.user._id,
        comment,
        createdAt: new Date(),
        createdBy: req.user._id
      };

      review.replies = [reply];
      review.lastModifiedBy = req.user._id;
      review.lastModifiedAt = new Date();
      await review.save();

      // Log de la acción
      review.logAccess(req.user._id, 'review_replied', {
        reviewId: review._id
      });

      // Enviar notificación al cliente
      try {
        await Notification.create({
          recipientId: review.clientId,
          senderId: req.user._id,
          type: 'review_replied',
          title: 'Respuesta a tu reseña',
          message: `${req.user.fullName} ha respondido a tu reseña`,
          priority: 'normal',
          metadata: {
            reviewId: review._id,
            serviceId: review.serviceId
          }
        });
      } catch (notificationError) {
        logger.error('Error sending notification:', notificationError);
      }

      // Populate para la respuesta
      const updatedReview = await Review.findById(req.params.id)
        .populate('serviceId', 'name description price')
        .populate('professionalId', 'fullName email avatar professionalInfo')
        .populate('clientId', 'fullName email avatar')
        .populate('replies.professionalId', 'fullName email avatar');

      res.json({
        success: true,
        message: 'Respuesta agregada exitosamente',
        data: updatedReview
      });

    } catch (error) {
      logger.error('Error in replyToReview:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener reseñas por servicio
   */
  static async getReviewsByService(req, res) {
    try {
      const { serviceId } = req.params;
      const {
        rating,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Verificar que el servicio exista
      const service = await Service.findById(serviceId);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      // Construir filtros
      const filters = {
        serviceId,
        isDeleted: false
      };

      if (rating) filters.rating = parseInt(rating);

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find(filters)
          .populate('professionalId', 'fullName email avatar professionalInfo')
          .populate('clientId', 'fullName email avatar')
          .populate('replies.professionalId', 'fullName email avatar')
          .sort(sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'rating' ? { rating: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'helpfulCount' ? { helpfulCount: sortOrder === 'desc' ? -1 : 1 } :
                { createdAt: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Review.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getReviewsByService:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener reseñas por profesional
   */
  static async getReviewsByProfessional(req, res) {
    try {
      const { professionalId } = req.params;
      const {
        rating,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = req.query;

      // Verificar que el profesional exista
      const professional = await User.findById(professionalId);
      if (!professional) {
        return res.status(404).json({
          success: false,
          message: 'Profesional no encontrado'
        });
      }

      // Construir filtros
      const filters = {
        professionalId,
        isDeleted: false
      };

      if (rating) filters.rating = parseInt(rating);

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find(filters)
          .populate('serviceId', 'name description price')
          .populate('clientId', 'fullName email avatar')
          .populate('replies.professionalId', 'fullName email avatar')
          .sort(sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'rating' ? { rating: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'helpfulCount' ? { helpfulCount: sortOrder === 'desc' ? -1 : 1 } :
                { createdAt: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Review.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getReviewsByProfessional:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de reseñas
   */
  static async getReviewStats(req, res) {
    try {
      const { serviceId, professionalId, dateFrom, dateTo } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };
      if (serviceId) filters.serviceId = serviceId;
      if (professionalId) filters.professionalId = professionalId;
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      const stats = await Review.getReviewStats(filters);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getReviewStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Verificar reseña (solo administradores)
   */
  static async verifyReview(req, res) {
    try {
      const { isVerified } = req.body;

      const review = await Review.findById(req.params.id);
      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Reseña no encontrada'
        });
      }

      // Verificar permisos
      if (req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden verificar reseñas'
        });
      }

      review.isVerified = isVerified;
      review.verifiedAt = new Date();
      review.verifiedBy = req.user._id;
      review.lastModifiedBy = req.user._id;
      review.lastModifiedAt = new Date();
      await review.save();

      // Log de la acción
      review.logAccess(req.user._id, 'review_verified', {
        isVerified
      });

      res.json({
        success: true,
        message: `Reseña ${isVerified ? 'verificada' : 'desverificada'} exitosamente`,
        data: {
          reviewId: review._id,
          isVerified: review.isVerified,
          verifiedAt: review.verifiedAt
        }
      });

    } catch (error) {
      logger.error('Error in verifyReview:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = ReviewController;
