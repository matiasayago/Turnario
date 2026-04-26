const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const Clinic = require('../models/Clinic');
const Service = require('../models/Service');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { catchAsync } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Middleware de validación
const validateClinic = [
  body('name').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Nombre debe tener entre 1 y 200 caracteres'),
  body('description').optional().isString().trim().isLength({ max: 2000 }),
  body('businessType').isIn(['medical', 'beauty', 'legal', 'educational', 'technical', 'financial', 'consulting', 'other']).withMessage('Tipo de negocio inválido'),
  body('category').isIn([
    'general_medicine', 'dental', 'ophthalmology', 'dermatology', 'cardiology',
    'neurology', 'orthopedics', 'pediatrics', 'gynecology', 'psychology', 'psychiatry',
    'nutrition', 'physiotherapy', 'laboratory', 'imaging', 'surgery', 'emergency',
    'veterinary', 'beauty_salon', 'hair_salon', 'nail_salon', 'spa', 'massage_center',
    'aesthetic_clinic', 'cosmetic_surgery', 'law_firm', 'notary_office', 'legal_consulting',
    'language_school', 'music_school', 'dance_school', 'art_school', 'sports_center',
    'tutoring_center', 'computer_repair', 'phone_repair', 'car_repair', 'home_repair',
    'photography_studio', 'event_venue', 'consulting_firm', 'other'
  ]).withMessage('Categoría inválida'),
  body('contact.email').isEmail().withMessage('Email inválido'),
  body('contact.phone').isString().isLength({ min: 1, max: 20 }).withMessage('Teléfono es requerido'),
  body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordenadas deben tener exactamente 2 valores'),
  body('location.coordinates.*').isFloat({ min: -180, max: 180 }).withMessage('Coordenadas inválidas'),
  body('location.address.street').isString().isLength({ min: 1, max: 200 }).withMessage('Calle es requerida'),
  body('location.address.city').isString().isLength({ min: 1, max: 100 }).withMessage('Ciudad es requerida'),
  body('location.address.state').isString().isLength({ min: 1, max: 100 }).withMessage('Estado/Provincia es requerido')
];

const validateClinicUpdate = [
  body('name').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().trim().isLength({ max: 2000 }),
  body('contact.email').optional().isEmail(),
  body('contact.phone').optional().isString().isLength({ min: 1, max: 20 }),
  body('status').optional().isIn(['active', 'inactive', 'suspended', 'pending_approval', 'closed'])
];

// GET /api/v1/clinics - Obtener clínicas con filtros
router.get('/', 
  [
    query('businessType').optional().isString(),
    query('category').optional().isString(),
    query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending_approval', 'closed']),
    query('isVerified').optional().isBoolean(),
    query('search').optional().isString(),
    query('location').optional().isObject(),
    query('sortBy').optional().isIn(['rating', 'distance', 'name']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      businessType,
      category,
      status = 'active',
      isVerified,
      search,
      location,
      sortBy = 'rating',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Construir filtros
    const filters = {
      businessType,
      category,
      status,
      isVerified,
      location: location ? {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        radius: location.radius ? parseFloat(location.radius) : 10000
      } : undefined
    };

    let clinics;
    let total;

    if (search) {
      // Búsqueda con filtros
      clinics = await Clinic.search(search, filters);
      total = clinics.length;
    } else {
      // Consulta directa
      const query = { isDeleted: false };
      
      if (businessType) query.businessType = businessType;
      if (category) query.category = category;
      if (status) query.status = status;
      if (isVerified !== undefined) query.isVerified = isVerified;

      // Calcular paginación
      const skip = (page - 1) * limit;
      
      [clinics, total] = await Promise.all([
        Clinic.find(query)
          .populate('owner', 'fullName email phone')
          .populate('staff.user', 'fullName email phone')
          .sort(sortBy === 'name' ? { name: sortOrder === 'desc' ? -1 : 1 } : { 'rating.average': -1, 'rating.count': -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Clinic.countDocuments(query)
      ]);
    }

    res.json({
      success: true,
      data: clinics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// GET /api/v1/clinics/:id - Obtener clínica específica
router.get('/:id',
  [
    param('id').isMongoId().withMessage('ID de clínica inválido')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const clinic = await Clinic.findById(req.params.id)
      .populate('owner', 'fullName email phone')
      .populate('staff.user', 'fullName email phone')
      .populate('services', 'name description basePrice duration');

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Solo mostrar clínicas activas y no eliminadas
    if (clinic.status !== 'active' || clinic.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no disponible'
      });
    }

    res.json({
      success: true,
      data: clinic
    });
  })
);

// POST /api/v1/clinics - Crear nueva clínica
router.post('/',
  authenticateToken,
  requireRole('professional'),
  validateClinic,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      name,
      businessName,
      description,
      shortDescription,
      businessType,
      category,
      subcategory,
      tags,
      contact,
      location,
      operatingHours,
      reminders = {},
      isPrivate = false,
      requiresInsurance = false,
      insuranceAccepted,
      seoTitle,
      seoDescription,
      keywords
    } = req.body;

    // Verificar que el usuario sea el propietario
    if (req.body.owner !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes crear clínicas para ti mismo'
      });
    }

    // Crear la clínica
    const clinic = new Clinic({
      name,
      businessName,
      description,
      shortDescription,
      businessType,
      category,
      subcategory,
      tags,
      contact,
      location: {
        ...location,
        coordinates: [parseFloat(location.coordinates[0]), parseFloat(location.coordinates[1])]
      },
      operatingHours: operatingHours || {
        monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
        saturday: { isOpen: false },
        sunday: { isOpen: false }
      },
      owner: req.user._id,
      staff: [{
        user: req.user._id,
        role: 'owner',
        permissions: [
          'manage_clinic', 'manage_staff', 'manage_services', 'manage_appointments',
          'view_reports', 'manage_finances', 'manage_settings'
        ],
        startDate: new Date(),
        isActive: true
      }],
      reminders,
      isPrivate,
      requiresInsurance,
      insuranceAccepted,
      seoTitle,
      seoDescription,
      keywords,
      createdBy: req.user._id
    });

    // Validar la clínica antes de guardar
    const validationErrors = clinic.validateClinic();
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Datos de clínica inválidos',
        errors: validationErrors
      });
    }

    await clinic.save();

    // Log de la acción
    clinic.logAccess(req.user._id, 'clinic_created', {
      clinicName: clinic.name,
      businessType: clinic.businessType,
      category: clinic.category
    });

    // Populate para la respuesta
    await clinic.populate([
      { path: 'owner', select: 'fullName email phone' },
      { path: 'staff.user', select: 'fullName email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Clínica creada exitosamente',
      data: clinic
    });
  })
);

// PUT /api/v1/clinics/:id - Actualizar clínica
router.put('/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de clínica inválido')
  ],
  validateClinicUpdate,
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Verificar que el usuario sea el propietario o tenga permisos de gestión
    const isOwner = clinic.owner.toString() === req.user._id.toString();
    const hasManagePermission = clinic.staff.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.isActive && 
      member.permissions.includes('manage_clinic')
    );

    if (!isOwner && !hasManagePermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta clínica'
      });
    }

    // Actualizar campos permitidos
    const updateFields = [
      'name', 'businessName', 'description', 'shortDescription', 'subcategory',
      'tags', 'contact', 'operatingHours', 'reminders', 'isPrivate',
      'requiresInsurance', 'insuranceAccepted', 'seoTitle', 'seoDescription',
      'keywords', 'status'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        clinic[field] = req.body[field];
      }
    });

    // Si se actualiza la ubicación, validar coordenadas
    if (req.body.location) {
      clinic.location = {
        ...clinic.location,
        ...req.body.location,
        coordinates: req.body.location.coordinates ? 
          [parseFloat(req.body.location.coordinates[0]), parseFloat(req.body.coordinates[1])] : 
          clinic.location.coordinates
      };
    }

    clinic.lastModifiedBy = req.user._id;
    await clinic.save();

    // Log de la acción
    clinic.logAccess(req.user._id, 'clinic_updated', {
      clinicName: clinic.name,
      changes: req.body
    });

    // Populate para la respuesta
    await clinic.populate([
      { path: 'owner', select: 'fullName email phone' },
      { path: 'staff.user', select: 'fullName email phone' }
    ]);

    res.json({
      success: true,
      message: 'Clínica actualizada exitosamente',
      data: clinic
    });
  })
);

// PATCH /api/v1/clinics/:id/status - Cambiar estado de la clínica
router.patch('/:id/status',
  authenticateToken,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('ID de clínica inválido'),
    body('status').isIn(['active', 'inactive', 'suspended', 'pending_approval', 'closed']).withMessage('Estado inválido'),
    body('reason').optional().isString().isLength({ max: 500 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { status, reason } = req.body;
    const clinic = await Clinic.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    const oldStatus = clinic.status;
    clinic.status = status;
    clinic.lastModifiedBy = req.user._id;
    await clinic.save();

    // Log de la acción
    clinic.logAccess(req.user._id, 'clinic_status_changed', {
      clinicName: clinic.name,
      oldStatus,
      newStatus: status,
      reason
    });

    res.json({
      success: true,
      message: `Estado de la clínica cambiado a ${status}`,
      data: clinic
    });
  })
);

// PATCH /api/v1/clinics/:id/verify - Verificar clínica
router.patch('/:id/verify',
  authenticateToken,
  requireRole('admin'),
  [
    param('id').isMongoId().withMessage('ID de clínica inválido'),
    body('isVerified').isBoolean().withMessage('Estado de verificación debe ser un booleano')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { isVerified } = req.body;
    const clinic = await Clinic.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    clinic.isVerified = isVerified;
    clinic.lastModifiedBy = req.user._id;
    await clinic.save();

    // Log de la acción
    clinic.logAccess(req.user._id, 'clinic_verification_changed', {
      clinicName: clinic.name,
      isVerified
    });

    res.json({
      success: true,
      message: `Clínica ${isVerified ? 'verificada' : 'desverificada'} exitosamente`,
      data: clinic
    });
  })
);

// DELETE /api/v1/clinics/:id - Eliminar clínica (soft delete)
router.delete('/:id',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de clínica inválido')
  ],
  catchAsync(async (req, res) => {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Verificar que el usuario sea el propietario
    if (clinic.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta clínica'
      });
    }

    // Soft delete
    await clinic.softDelete(req.user._id);

    // Log de la acción
    clinic.logAccess(req.user._id, 'clinic_deleted', {
      clinicName: clinic.name
    });

    res.json({
      success: true,
      message: 'Clínica eliminada exitosamente'
    });
  })
);

// POST /api/v1/clinics/:id/staff - Agregar miembro del personal
router.post('/:id/staff',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de clínica inválido'),
    body('userId').isMongoId().withMessage('ID de usuario inválido'),
    body('role').isIn(['manager', 'professional', 'assistant', 'receptionist', 'other']).withMessage('Rol inválido'),
    body('permissions').optional().isArray()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { userId, role, permissions = [] } = req.body;
    const clinic = await Clinic.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Verificar que el usuario sea el propietario o tenga permisos de gestión
    const isOwner = clinic.owner.toString() === req.user._id.toString();
    const hasManagePermission = clinic.staff.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.isActive && 
      member.permissions.includes('manage_staff')
    );

    if (!isOwner && !hasManagePermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para gestionar el personal'
      });
    }

    // Agregar miembro del personal
    await clinic.addStaffMember(userId, role, permissions);

    // Log de la acción
    clinic.logAccess(req.user._id, 'staff_member_added', {
      clinicName: clinic.name,
      userId,
      role
    });

    res.json({
      success: true,
      message: 'Miembro del personal agregado exitosamente',
      data: clinic
    });
  })
);

// DELETE /api/v1/clinics/:id/staff/:userId - Remover miembro del personal
router.delete('/:id/staff/:userId',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de clínica inválido'),
    param('userId').isMongoId().withMessage('ID de usuario inválido')
  ],
  catchAsync(async (req, res) => {
    const { id, userId } = req.params;
    const clinic = await Clinic.findById(id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Verificar que el usuario sea el propietario o tenga permisos de gestión
    const isOwner = clinic.owner.toString() === req.user._id.toString();
    const hasManagePermission = clinic.staff.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.isActive && 
      member.permissions.includes('manage_staff')
    );

    if (!isOwner && !hasManagePermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para gestionar el personal'
      });
    }

    // Remover miembro del personal
    await clinic.removeStaffMember(userId);

    // Log de la acción
    clinic.logAccess(req.user._id, 'staff_member_removed', {
      clinicName: clinic.name,
      userId
    });

    res.json({
      success: true,
      message: 'Miembro del personal removido exitosamente',
      data: clinic
    });
  })
);

// PUT /api/v1/clinics/:id/staff/:userId - Actualizar rol del personal
router.put('/:id/staff/:userId',
  authenticateToken,
  [
    param('id').isMongoId().withMessage('ID de clínica inválido'),
    param('userId').isMongoId().withMessage('ID de usuario inválido'),
    body('role').isIn(['manager', 'professional', 'assistant', 'receptionist', 'other']).withMessage('Rol inválido'),
    body('permissions').optional().isArray()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { id, userId } = req.params;
    const { role, permissions = [] } = req.body;
    const clinic = await Clinic.findById(id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    // Verificar que el usuario sea el propietario o tenga permisos de gestión
    const isOwner = clinic.owner.toString() === req.user._id.toString();
    const hasManagePermission = clinic.staff.some(member => 
      member.user.toString() === req.user._id.toString() && 
      member.isActive && 
      member.permissions.includes('manage_staff')
    );

    if (!isOwner && !hasManagePermission) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para gestionar el personal'
      });
    }

    // Actualizar rol del personal
    await clinic.updateStaffRole(userId, role, permissions);

    // Log de la acción
    clinic.logAccess(req.user._id, 'staff_role_updated', {
      clinicName: clinic.name,
      userId,
      newRole: role
    });

    res.json({
      success: true,
      message: 'Rol del personal actualizado exitosamente',
      data: clinic
    });
  })
);

// GET /api/v1/clinics/owner/:ownerId - Obtener clínicas de un propietario
router.get('/owner/:ownerId',
  [
    param('ownerId').isMongoId().withMessage('ID de propietario inválido'),
    query('status').optional().isString(),
    query('businessType').optional().isString(),
    query('category').optional().isString()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { ownerId } = req.params;
    const { status, businessType, category } = req.query;

    const filters = { status, businessType, category };
    const clinics = await Clinic.findByOwner(ownerId, filters);

    res.json({
      success: true,
      data: clinics
    });
  })
);

// GET /api/v1/clinics/location - Buscar clínicas por ubicación
router.get('/location',
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
    query('radius').optional().isFloat({ min: 1000, max: 100000 }).withMessage('Radio debe estar entre 1km y 100km'),
    query('businessType').optional().isString(),
    query('category').optional().isString(),
    query('isVerified').optional().isBoolean()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { lat, lng, radius = 10000, businessType, category, isVerified } = req.query;
    const filters = { businessType, category, isVerified };

    const clinics = await Clinic.findByLocation(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius),
      filters
    );

    res.json({
      success: true,
      data: clinics
    });
  })
);

// GET /api/v1/clinics/search - Búsqueda avanzada de clínicas
router.get('/search',
  [
    query('q').optional().isString(),
    query('businessType').optional().isString(),
    query('category').optional().isString(),
    query('isVerified').optional().isBoolean(),
    query('location').optional().isObject(),
    query('sortBy').optional().isIn(['rating', 'distance', 'name']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const {
      q: searchTerm,
      businessType,
      category,
      isVerified,
      location,
      sortBy = 'rating',
      sortOrder = 'desc',
      limit = 50
    } = req.query;

    // Construir filtros
    const filters = {
      businessType,
      category,
      isVerified,
      location: location ? {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lng),
        radius: location.radius ? parseFloat(location.radius) : 10000
      } : undefined,
      sortBy,
      sortOrder,
      limit: parseInt(limit)
    };

    const clinics = await Clinic.search(searchTerm, filters);

    res.json({
      success: true,
      data: clinics
    });
  })
);

// GET /api/v1/clinics/popular - Obtener clínicas populares
router.get('/popular',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('businessType').optional().isString(),
    query('category').optional().isString()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { limit = 10, businessType, category } = req.query;
    const filters = { businessType, category };

    const clinics = await Clinic.getPopularClinics(parseInt(limit), filters);

    res.json({
      success: true,
      data: clinics
    });
  })
);

// GET /api/v1/clinics/stats - Obtener estadísticas de clínicas
router.get('/stats',
  authenticateToken,
  [
    query('owner').optional().isMongoId(),
    query('businessType').optional().isString(),
    query('category').optional().isString(),
    query('status').optional().isString(),
    query('isVerified').optional().isBoolean()
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const filters = {
      owner: req.query.owner,
      businessType: req.query.businessType,
      category: req.query.category,
      status: req.query.status,
      isVerified: req.query.isVerified
    };

    // Aplicar filtros según el rol del usuario
    if (req.user.userType === 'professional') {
      filters.owner = req.user._id;
    }

    const stats = await Clinic.getClinicStats(filters);

    res.json({
      success: true,
      data: stats
    });
  })
);

// POST /api/v1/clinics/:id/availability - Verificar disponibilidad
router.post('/:id/availability',
  [
    param('id').isMongoId().withMessage('ID de clínica inválido'),
    body('date').isISO8601().withMessage('Fecha inválida'),
    body('time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora inválida (HH:MM)')
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { date, time } = req.body;
    const clinic = await Clinic.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    if (clinic.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Clínica no está activa'
      });
    }

    // Verificar disponibilidad
    const isOpen = clinic.isOpenAt(new Date(date), time);

    res.json({
      success: true,
      data: {
        isOpen,
        clinic: {
          id: clinic._id,
          name: clinic.name,
          schedule: clinic.todaySchedule
        }
      }
    });
  })
);

// GET /api/v1/clinics/:id/slots - Obtener slots disponibles
router.get('/:id/slots',
  [
    param('id').isMongoId().withMessage('ID de clínica inválido'),
    query('date').isISO8601().withMessage('Fecha inválida'),
    query('slotDuration').optional().isInt({ min: 15, max: 480 })
  ],
  catchAsync(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { date, slotDuration = 30 } = req.query;
    const clinic = await Clinic.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: 'Clínica no encontrada'
      });
    }

    if (clinic.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Clínica no está activa'
      });
    }

    // Obtener slots disponibles
    const slots = clinic.getAvailableSlots(new Date(date), parseInt(slotDuration));

    res.json({
      success: true,
      data: {
        clinic: {
          id: clinic._id,
          name: clinic.name
        },
        date: new Date(date),
        slotDuration: parseInt(slotDuration),
        slots
      }
    });
  })
);

module.exports = router;
