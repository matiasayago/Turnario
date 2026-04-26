const Category = require('../models/Category');
const Service = require('../models/Service');
const logger = require('../config/logger');

class CategoryController {
  /**
   * Obtener lista de categorías con filtros
   */
  static async getCategories(req, res) {
    try {
      const {
        parentId,
        isActive,
        sortBy = 'name',
        sortOrder = 'asc',
        page = 1,
        limit = 20
      } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };

      if (parentId !== undefined) {
        if (parentId === 'null' || parentId === '') {
          filters.parentId = null;
        } else {
          filters.parentId = parentId;
        }
      }
      if (isActive !== undefined) filters.isActive = isActive === 'true';

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [categories, total] = await Promise.all([
        Category.find(filters)
          .populate('parentId', 'name description')
          .populate('children', 'name description isActive')
          .sort(sortBy === 'name' ? { name: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'serviceCount' ? { serviceCount: sortOrder === 'desc' ? -1 : 1 } :
                { name: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Category.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener categoría específica
   */
  static async getCategoryById(req, res) {
    try {
      const category = await Category.findById(req.params.id)
        .populate('parentId', 'name description')
        .populate('children', 'name description isActive');

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      res.json({
        success: true,
        data: category
      });

    } catch (error) {
      logger.error('Error in getCategoryById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Crear nueva categoría
   */
  static async createCategory(req, res) {
    try {
      const {
        name,
        description,
        parentId,
        icon,
        color,
        metadata = {}
      } = req.body;

      // Verificar permisos
      if (req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden crear categorías'
        });
      }

      // Verificar que el nombre sea único
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        isDeleted: false
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una categoría con ese nombre'
        });
      }

      // Verificar que la categoría padre exista si se especifica
      if (parentId) {
        const parentCategory = await Category.findById(parentId);
        if (!parentCategory || parentCategory.isDeleted) {
          return res.status(400).json({
            success: false,
            message: 'Categoría padre no encontrada'
          });
        }
      }

      const categoryData = {
        name,
        description,
        parentId: parentId || null,
        icon,
        color,
        isActive: true,
        metadata,
        createdBy: req.user._id
      };

      const category = new Category(categoryData);
      await category.save();

      // Log de la acción
      category.logAccess(req.user._id, 'category_created', {
        name,
        parentId
      });

      // Populate para la respuesta
      const createdCategory = await Category.findById(category._id)
        .populate('parentId', 'name description')
        .populate('children', 'name description isActive');

      res.status(201).json({
        success: true,
        message: 'Categoría creada exitosamente',
        data: createdCategory
      });

    } catch (error) {
      logger.error('Error in createCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar categoría
   */
  static async updateCategory(req, res) {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Verificar permisos
      if (req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden modificar categorías'
        });
      }

      const {
        name,
        description,
        parentId,
        icon,
        color,
        metadata
      } = req.body;

      // Verificar que el nombre sea único si se está cambiando
      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          name: { $regex: new RegExp(`^${name}$`, 'i') },
          _id: { $ne: category._id },
          isDeleted: false
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: 'Ya existe una categoría con ese nombre'
          });
        }
      }

      // Verificar que la categoría padre exista si se especifica
      if (parentId && parentId !== category.parentId?.toString()) {
        if (parentId === category._id.toString()) {
          return res.status(400).json({
            success: false,
            message: 'Una categoría no puede ser su propia padre'
          });
        }

        const parentCategory = await Category.findById(parentId);
        if (!parentCategory || parentCategory.isDeleted) {
          return res.status(400).json({
            success: false,
            message: 'Categoría padre no encontrada'
          });
        }
      }

      // Actualizar campos permitidos
      const updateFields = ['name', 'description', 'parentId', 'icon', 'color', 'metadata'];
      updateFields.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === 'parentId') {
            category[field] = req.body[field] || null;
          } else {
            category[field] = req.body[field];
          }
        }
      });

      category.lastModifiedBy = req.user._id;
      category.lastModifiedAt = new Date();
      await category.save();

      // Log de la acción
      category.logAccess(req.user._id, 'category_updated', {
        changes: req.body
      });

      // Populate para la respuesta
      const updatedCategory = await Category.findById(req.params.id)
        .populate('parentId', 'name description')
        .populate('children', 'name description isActive');

      res.json({
        success: true,
        message: 'Categoría actualizada exitosamente',
        data: updatedCategory
      });

    } catch (error) {
      logger.error('Error in updateCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Cambiar estado de la categoría
   */
  static async updateCategoryStatus(req, res) {
    try {
      const { isActive } = req.body;

      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Verificar permisos
      if (req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden cambiar el estado de las categorías'
        });
      }

      category.isActive = isActive;
      category.lastModifiedBy = req.user._id;
      category.lastModifiedAt = new Date();
      await category.save();

      // Log de la acción
      category.logAccess(req.user._id, 'category_status_changed', {
        isActive
      });

      res.json({
        success: true,
        message: `Estado de la categoría cambiado a ${isActive ? 'activa' : 'inactiva'}`,
        data: {
          categoryId: category._id,
          isActive: category.isActive
        }
      });

    } catch (error) {
      logger.error('Error in updateCategoryStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar categoría (soft delete)
   */
  static async deleteCategory(req, res) {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Verificar permisos
      if (req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden eliminar categorías'
        });
      }

      // Verificar que no tenga servicios asociados
      const serviceCount = await Service.countDocuments({
        categoryId: category._id,
        isDeleted: false
      });

      if (serviceCount > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar la categoría porque tiene ${serviceCount} servicios asociados`
        });
      }

      // Verificar que no tenga categorías hijas
      const childrenCount = await Category.countDocuments({
        parentId: category._id,
        isDeleted: false
      });

      if (childrenCount > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar la categoría porque tiene ${childrenCount} subcategorías`
        });
      }

      category.isDeleted = true;
      category.deletedAt = new Date();
      category.deletedBy = req.user._id;
      category.lastModifiedBy = req.user._id;
      category.lastModifiedAt = new Date();
      await category.save();

      // Log de la acción
      category.logAccess(req.user._id, 'category_deleted');

      res.json({
        success: true,
        message: 'Categoría eliminada exitosamente',
        data: {
          categoryId: category._id
        }
      });

    } catch (error) {
      logger.error('Error in deleteCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener árbol de categorías
   */
  static async getCategoryTree(req, res) {
    try {
      const { includeInactive = false } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };
      if (!includeInactive) filters.isActive = true;

      // Obtener todas las categorías
      const categories = await Category.find(filters)
        .populate('parentId', 'name description')
        .populate('children', 'name description isActive')
        .sort({ name: 1 });

      // Construir el árbol
      const buildTree = (parentId = null) => {
        return categories
          .filter(cat => 
            parentId === null ? !cat.parentId : cat.parentId?._id.toString() === parentId
          )
          .map(cat => ({
            ...cat.toObject(),
            children: buildTree(cat._id.toString())
          }));
      };

      const categoryTree = buildTree();

      res.json({
        success: true,
        data: categoryTree
      });

    } catch (error) {
      logger.error('Error in getCategoryTree:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener servicios por categoría
   */
  static async getServicesByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const {
        isActive,
        sortBy = 'name',
        sortOrder = 'asc',
        page = 1,
        limit = 20
      } = req.query;

      // Verificar que la categoría exista
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Construir filtros
      const filters = {
        categoryId,
        isDeleted: false
      };

      if (isActive !== undefined) filters.isActive = isActive === 'true';

      // Calcular paginación
      const skip = (page - 1) * limit;

      const [services, total] = await Promise.all([
        Service.find(filters)
          .populate('professionalId', 'fullName email phone avatar professionalInfo')
          .populate('categoryId', 'name description')
          .sort(sortBy === 'name' ? { name: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'price' ? { price: sortOrder === 'desc' ? -1 : 1 } :
                sortBy === 'createdAt' ? { createdAt: sortOrder === 'desc' ? -1 : 1 } :
                { name: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Service.countDocuments(filters)
      ]);

      res.json({
        success: true,
        data: {
          category,
          services
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Error in getServicesByCategory:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Buscar categorías
   */
  static async searchCategories(req, res) {
    try {
      const {
        query,
        isActive,
        parentId,
        limit = 10
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'El parámetro query es requerido'
        });
      }

      // Construir filtros
      const filters = {
        isDeleted: false,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      };

      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (parentId !== undefined) {
        if (parentId === 'null' || parentId === '') {
          filters.parentId = null;
        } else {
          filters.parentId = parentId;
        }
      }

      const categories = await Category.find(filters)
        .populate('parentId', 'name description')
        .populate('children', 'name description isActive')
        .sort({ name: 1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: categories,
        total: categories.length
      });

    } catch (error) {
      logger.error('Error in searchCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener estadísticas de categorías
   */
  static async getCategoryStats(req, res) {
    try {
      const { includeInactive = false } = req.query;

      // Construir filtros
      const filters = { isDeleted: false };
      if (!includeInactive) filters.isActive = true;

      const stats = await Category.getCategoryStats(filters);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error in getCategoryStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener categorías principales (sin padre)
   */
  static async getMainCategories(req, res) {
    try {
      const { isActive } = req.query;

      // Construir filtros
      const filters = {
        parentId: null,
        isDeleted: false
      };

      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const categories = await Category.find(filters)
        .populate('children', 'name description isActive')
        .sort({ name: 1 });

      res.json({
        success: true,
        data: categories,
        total: categories.length
      });

    } catch (error) {
      logger.error('Error in getMainCategories:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener subcategorías de una categoría
   */
  static async getSubcategories(req, res) {
    try {
      const { categoryId } = req.params;
      const { isActive } = req.query;

      // Verificar que la categoría exista
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
      }

      // Construir filtros
      const filters = {
        parentId: categoryId,
        isDeleted: false
      };

      if (isActive !== undefined) filters.isActive = isActive === 'true';

      const subcategories = await Category.find(filters)
        .populate('children', 'name description isActive')
        .sort({ name: 1 });

      res.json({
        success: true,
        data: {
          parent: category,
          subcategories
        },
        total: subcategories.length
      });

    } catch (error) {
      logger.error('Error in getSubcategories:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = CategoryController;
