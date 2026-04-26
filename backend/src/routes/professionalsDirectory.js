const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Nombres de consultorio desde professionalClinicsConfig (app Turnario). */
function extractClinicNames(config) {
  if (!config || typeof config !== 'object') return [];
  const clinics = config.clinics;
  if (!Array.isArray(clinics)) return [];
  const names = [];
  for (const c of clinics) {
    if (!c || typeof c !== 'object') continue;
    const n = c.clinicName != null ? String(c.clinicName).trim() : '';
    if (n) names.push(n);
  }
  return [...new Set(names)];
}

/**
 * GET /api/v1/professionals
 * Listado público de profesionales activos para que los clientes reserven.
 * Opcional: ?search=texto (nombre o servicio)
 */
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Base de datos no disponible',
        data: [],
      });
    }

    const search = String(req.query.search || '').trim();
    const q = {
      userType: 'professional',
      'status.isActive': true,
    };

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      q.$or = [{ fullName: rx }, { service: rx }];
    }

    const list = await User.find(q)
      .select(
        'fullName service businessInfo stats phone clientBookingRequiresDeposit professionalClinicsConfig offersAllCatalogServices'
      )
      .sort({ fullName: 1 })
      .limit(100)
      .lean();

    const data = list.map((u) => {
      const name = u.fullName || 'Profesional';
      const svc = (u.service || '').trim();
      const businessCategory = (
        u.businessInfo &&
        u.businessInfo.businessCategory &&
        String(u.businessInfo.businessCategory).trim()
      ) || '';
      /** Varios rubros para matching con el catálogo (servicio + categoría del negocio). */
      const servicesList = [];
      if (svc) servicesList.push(svc);
      if (businessCategory && businessCategory !== svc) {
        servicesList.push(businessCategory);
      }
      const initials =
        name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => (p[0] ? p[0].toUpperCase() : ''))
          .join('') || 'P';

      const specialty = businessCategory || (svc ? svc : 'Profesional');

      const stats = u.stats || {};
      const clinicNames = extractClinicNames(u.professionalClinicsConfig);
      const businessName =
        (u.businessInfo && u.businessInfo.businessName && String(u.businessInfo.businessName).trim()) || '';
      const locationLine =
        clinicNames.length > 0 ? clinicNames.join(' · ') : businessName;

      return {
        id: String(u._id),
        name,
        specialty,
        services: servicesList,
        offersAllCatalogServices: u.offersAllCatalogServices === true,
        rating: typeof stats.averageRating === 'number' ? stats.averageRating : 4.5,
        reviews: typeof stats.totalReviews === 'number' ? stats.totalReviews : 0,
        price: 5000,
        duration: 50,
        image: undefined,
        isAvailable: true,
        location: locationLine,
        clinicNames,
        avatar: initials,
        experience: '',
        phone: u.phone ? String(u.phone).trim() : '',
        clientBookingRequiresDeposit: u.clientBookingRequiresDeposit !== false,
      };
    });

    const consultorio = String(req.query.consultorio || '').trim().toLowerCase();
    const filtered =
      consultorio.length > 0
        ? data.filter((p) => {
            const loc = (p.location || '').toLowerCase();
            const clinics = Array.isArray(p.clinicNames) ? p.clinicNames : [];
            return (
              loc.includes(consultorio) ||
              clinics.some((n) => String(n).toLowerCase().includes(consultorio))
            );
          })
        : data;

    res.json({ success: true, data: filtered });
  } catch (err) {
    console.error('GET /api/v1/professionals:', err);
    res.status(500).json({
      success: false,
      message: 'Error al listar profesionales',
      data: [],
    });
  }
});

module.exports = router;
