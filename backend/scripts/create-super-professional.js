/**
 * Crea o actualiza un usuario profesional con acceso Pro ilimitado y
 * offersAllCatalogServices=true (aparece para cualquier servicio del catálogo en la app).
 *
 * Uso (desde la carpeta backend):
 *   node scripts/create-super-professional.js
 *
 * Variables opcionales en .env:
 *   SUPER_PRO_EMAIL           (default: super.professional@turnario.local)
 *   SUPER_PRO_PASSWORD        si no se define, se genera una y se imprime
 *   SUPER_PRO_FORCE_PASSWORD=1  si el usuario ya existe, también actualiza la contraseña
 *
 * Requiere MONGODB_URI en backend/.env
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/User');

const email = String(process.env.SUPER_PRO_EMAIL || 'super.professional@turnario.local')
  .trim()
  .toLowerCase();

let plainPassword = String(process.env.SUPER_PRO_PASSWORD || '').trim();
const forcePassword = String(process.env.SUPER_PRO_FORCE_PASSWORD || '').trim() === '1';

async function main() {
  if (!email) {
    console.error('SUPER_PRO_EMAIL vacío.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';
  await mongoose.connect(uri);
  console.log('Conectado a MongoDB');

  let generated = false;
  if (!plainPassword) {
    plainPassword = crypto.randomBytes(12).toString('base64url').slice(0, 14);
    generated = true;
  }
  if (plainPassword.length < 6) {
    console.error('La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  let user = await User.findOne({ email }).select('+password');

  if (!user) {
    user = new User({
      email,
      password: plainPassword,
      fullName: 'Super Profesional Turnario',
      userType: 'professional',
      phone: '+5490000000001',
      service: 'Turnario — multi-rubro',
      offersAllCatalogServices: true,
      clientBookingRequiresDeposit: false,
      subscriptionTier: 'pro',
      subscriptionExpiresAt: null,
      subscriptionProvider: 'manual_super',
      status: {
        isActive: true,
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
      },
      businessInfo: {
        businessName: 'Turnario (super profesional)',
        businessType: 'consulting',
        businessCategory: 'Turnario — todos los rubros',
      },
    });
    await user.save();
    console.log('Usuario creado.');
  } else {
    user.userType = 'professional';
    user.offersAllCatalogServices = true;
    user.clientBookingRequiresDeposit = false;
    user.subscriptionTier = 'pro';
    user.subscriptionExpiresAt = null;
    user.subscriptionProvider = 'manual_super';
    if (!user.status) user.status = {};
    user.status.isActive = true;
    user.status.isVerified = true;
    user.status.emailVerified = true;
    user.status.phoneVerified = true;
    user.deletedAt = undefined;
    if (!user.phone || String(user.phone).trim().length < 8) {
      user.phone = '+5490000000001';
    }
    if (forcePassword || process.env.SUPER_PRO_PASSWORD) {
      user.password = plainPassword;
    }
    await user.save();
    console.log('Usuario existente actualizado (flags Pro + directorio completo).');
  }

  console.log('');
  console.log('--- Super profesional ---');
  console.log('Email:', email);
  if (generated || forcePassword || process.env.SUPER_PRO_PASSWORD) {
    console.log('Contraseña:', plainPassword);
  } else {
    console.log('Contraseña: (sin cambios; usá SUPER_PRO_PASSWORD o SUPER_PRO_FORCE_PASSWORD=1)');
  }
  console.log('userType: professional');
  console.log('subscriptionTier: pro (sin vencimiento)');
  console.log('offersAllCatalogServices: true');
  console.log('clientBookingRequiresDeposit: false');
  console.log('');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
