const express = require('express');
const ExpoMedicalAuthorization = require('../models/ExpoMedicalAuthorization');
const User = require('../models/User');

const router = express.Router();

/** JWT en este server: req.user = { userId, email, userType } */
function sessionId(req) {
  const u = req.user;
  if (!u) return '';
  if (u.userId != null) return String(u.userId);
  if (u._id != null) return u._id.toString();
  return String(u.id || '');
}

function normalizeScope(body) {
  const s = body.scope && typeof body.scope === 'object' ? body.scope : {};
  return {
    consultations: s.consultations !== false,
    documents: !!s.documents,
    prescriptions: !!s.prescriptions,
    treatments: !!s.treatments,
    labResults: !!s.labResults,
    imaging: !!s.imaging,
  };
}

router.get('/', async (req, res) => {
  try {
    const uid = sessionId(req);
    const q = {};
    if (req.user.userType === 'client') q.patientId = uid;
    else if (req.user.userType === 'professional') q.professionalId = uid;
    else {
      return res.status(403).json({ success: false, message: 'Rol no soportado' });
    }

    const items = await ExpoMedicalAuthorization.find(q)
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, data: items });
  } catch (e) {
    console.error('GET medical-authorizations', e);
    res.status(500).json({ success: false, message: 'Error al listar autorizaciones' });
  }
});

router.post('/', async (req, res) => {
  try {
    const patientIdRaw = req.body?.patientId;
    if (!patientIdRaw || String(patientIdRaw).trim() === '') {
      return res.status(400).json({ success: false, message: 'patientId requerido' });
    }
    if (req.user.userType !== 'professional') {
      return res.status(403).json({ success: false, message: 'Solo el profesional puede solicitar' });
    }

    const professionalId = sessionId(req);
    const patientId = String(patientIdRaw).trim();
    if (patientId === professionalId) {
      return res.status(400).json({ success: false, message: 'Paciente inválido' });
    }

    const type = req.body.authorizationType;
    if (
      type != null &&
      !['full_access', 'limited_access', 'consultation_only'].includes(type)
    ) {
      return res.status(400).json({ success: false, message: 'Tipo inválido' });
    }

    const dup = await ExpoMedicalAuthorization.findOne({
      professionalId,
      patientId,
      status: 'pending',
    }).lean();
    if (dup) {
      return res.status(409).json({
        success: false,
        message: 'Ya hay una solicitud pendiente con este paciente',
      });
    }

    const patient = await User.findById(patientId).select('fullName').lean();
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    }

    const prof = await User.findById(professionalId).select('fullName').lean();
    const scope = normalizeScope(req.body);
    const authType = type || 'limited_access';
    let notes = '';
    if (typeof req.body.notes === 'string') {
      notes = req.body.notes.trim().slice(0, 1000);
    }

    const doc = await ExpoMedicalAuthorization.create({
      patientId,
      professionalId,
      professionalName: prof?.fullName || '',
      patientName: patient.fullName || '',
      authorizationType: authType,
      status: 'pending',
      isActive: false,
      grantedBy: 'patient',
      scope,
      notes,
    });

    res.status(201).json({ success: true, data: doc.toObject() });
  } catch (e) {
    console.error('POST medical-authorizations', e);
    res.status(500).json({ success: false, message: 'Error al crear solicitud' });
  }
});

router.patch('/:id/grant', async (req, res) => {
  try {
    if (req.user.userType !== 'client') {
      return res.status(403).json({ success: false, message: 'Solo el paciente puede aprobar' });
    }

    const patientId = sessionId(req);
    const doc = await ExpoMedicalAuthorization.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'No encontrada' });
    if (String(doc.patientId) !== patientId) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    if (doc.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'La solicitud no está pendiente' });
    }

    doc.status = 'granted';
    doc.isActive = true;
    doc.grantedAt = new Date();
    doc.grantedBy = 'patient';
    const days = parseInt(req.body.validDays, 10);
    if (!Number.isNaN(days) && days > 0) {
      doc.expiresAt = new Date(Date.now() + days * 86400000);
    }
    await doc.save();
    res.json({ success: true, data: doc.toObject() });
  } catch (e) {
    console.error('PATCH grant', e);
    res.status(500).json({ success: false, message: 'Error al otorgar' });
  }
});

router.patch('/:id/reject', async (req, res) => {
  try {
    if (req.user.userType !== 'client') {
      return res.status(403).json({ success: false, message: 'Solo el paciente puede rechazar' });
    }
    const patientId = sessionId(req);
    const doc = await ExpoMedicalAuthorization.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'No encontrada' });
    if (String(doc.patientId) !== patientId) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    if (doc.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'La solicitud no está pendiente' });
    }
    doc.status = 'revoked';
    doc.isActive = false;
    doc.revokedAt = new Date();
    doc.notes =
      (doc.notes ? `${doc.notes}\n` : '') +
      (typeof req.body.reason === 'string' ? `Rechazada: ${req.body.reason}` : 'Rechazada por el paciente');
    await doc.save();
    res.json({ success: true, data: doc.toObject() });
  } catch (e) {
    console.error('PATCH reject', e);
    res.status(500).json({ success: false, message: 'Error al rechazar' });
  }
});

router.patch('/:id/revoke', async (req, res) => {
  try {
    const uid = sessionId(req);
    const doc = await ExpoMedicalAuthorization.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'No encontrada' });

    const isPatient = req.user.userType === 'client' && String(doc.patientId) === uid;
    const isProf =
      req.user.userType === 'professional' && String(doc.professionalId) === uid;
    if (!isPatient && !isProf) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    if (doc.status !== 'granted' || !doc.isActive) {
      return res.status(400).json({ success: false, message: 'No hay autorización activa' });
    }

    doc.status = 'revoked';
    doc.isActive = false;
    doc.revokedAt = new Date();
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (reason) {
      doc.notes = (doc.notes ? `${doc.notes}\n` : '') + `Revocada: ${reason}`;
    }
    await doc.save();
    res.json({ success: true, data: doc.toObject() });
  } catch (e) {
    console.error('PATCH revoke', e);
    res.status(500).json({ success: false, message: 'Error al revocar' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.userType !== 'professional') {
      return res.status(403).json({ success: false, message: 'Solo el profesional puede cancelar su solicitud' });
    }
    const uid = sessionId(req);
    const doc = await ExpoMedicalAuthorization.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'No encontrada' });
    if (String(doc.professionalId) !== uid) {
      return res.status(403).json({ success: false, message: 'No autorizado' });
    }
    if (doc.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Solo se pueden cancelar solicitudes pendientes' });
    }
    await ExpoMedicalAuthorization.deleteOne({ _id: doc._id });
    res.json({ success: true, message: 'Solicitud cancelada' });
  } catch (e) {
    console.error('DELETE medical-authorizations', e);
    res.status(500).json({ success: false, message: 'Error al cancelar' });
  }
});

module.exports = router;
