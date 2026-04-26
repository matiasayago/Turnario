const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const CategoryController = require('../controllers/categoryController');

const router = express.Router();

// Validaciones
const createCategoryValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('description').optional().isString().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
  body('parentId').optional().isMongoId().withMessage('ID de categoría padre inválido'),
  body('icon').optional().isString().isLength({ max: 50 }).withMessage('El icono no puede exceder 50 caracteres'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color inválido (formato hexadecimal)')
];

const updateCategoryValidation = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('description').optional().isString().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
  body('parentId').optional().isMongoId().withMessage('ID de categoría padre inválido'),
  body('icon').optional().isString().isLength({ max: 50 }).withMessage('El icono no puede exceder 50 caracteres'),
  body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color inválido (formato hexadecimal)')
];

/**
 * @route   GET /api/categories
 * @desc    Obtener lista de categorías
 * @access  Public
 */
router.get('/', CategoryController.getCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Obtener categoría específica
 * @access  Public
 */
router.get('/:id', CategoryController.getCategoryById);

/**
 * @route   POST /api/categories
 * @desc    Crear nueva categoría
 * @access  Private (Admin)
 */
router.post('/', authenticateToken, requireRole(['admin']), createCategoryValidation, validateRequest, CategoryController.createCategory);

/**
 * @route   PUT /api/categories/:id
 * @desc    Actualizar categoría
 * @access  Private (Admin)
 */
router.put('/:id', authenticateToken, requireRole(['admin']), updateCategoryValidation, validateRequest, CategoryController.updateCategory);

/**
 * @route   PATCH /api/categories/:id/status
 * @desc    Cambiar estado de la categoría
 * @access  Private (Admin)
 */
router.patch('/:id/status', authenticateToken, requireRole(['admin']), CategoryController.updateCategoryStatus);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Eliminar categoría (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', authenticateToken, requireRole(['admin']), CategoryController.deleteCategory);

/**
 * @route   GET /api/categories/tree
 * @desc    Obtener árbol de categorías
 * @access  Public
 */
router.get('/tree', CategoryController.getCategoryTree);

/**
 * @route   GET /api/categories/:categoryId/services
 * @desc    Obtener servicios por categoría
 * @access  Public
 */
router.get('/:categoryId/services', CategoryController.getServicesByCategory);

/**
 * @route   GET /api/categories/search
 * @desc    Buscar categorías
 * @access  Public
 */
router.get('/search', CategoryController.searchCategories);

/**
 * @route   GET /api/categories/stats/overview
 * @desc    Obtener estadísticas de categorías
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticateToken, requireRole(['admin']), CategoryController.getCategoryStats);

/**
 * @route   GET /api/categories/main
 * @desc    Obtener categorías principales
 * @access  Public
 */
router.get('/main', CategoryController.getMainCategories);

/**
 * @route   GET /api/categories/:categoryId/subcategories
 * @desc    Obtener subcategorías
 * @access  Public
 */
router.get('/:categoryId/subcategories', CategoryController.getSubcategories);

module.exports = router;
