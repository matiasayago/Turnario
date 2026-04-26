/**
 * Restablece la contraseña de un usuario (hash bcrypt vía pre-save de User).
 * Uso:
 *   node scripts/reset-user-password.js <email> [nuevaContraseña]
 * Si omitís la contraseña, se genera una aleatoria y se imprime en consola.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/User');

const emailArg = (process.argv[2] || '').trim().toLowerCase();
let plain = (process.argv[3] || process.env.RESET_PASSWORD || '').trim();

async function main() {
  if (!emailArg) {
    console.error('Uso: node scripts/reset-user-password.js <email> [contraseña]');
    process.exit(1);
  }

  if (!plain) {
    plain = crypto.randomBytes(9).toString('base64url').slice(0, 12);
    console.log('(Contraseña generada automáticamente; guardala en un lugar seguro.)');
  }

  if (plain.length < 6) {
    console.error('La contraseña debe tener al menos 6 caracteres.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/turnario';
  await mongoose.connect(uri);

  const user = await User.findOne({ email: emailArg }).select('+password');
  if (!user) {
    console.error(`No existe usuario con email: ${emailArg}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.password = plain;
  await user.save();

  console.log(`OK — contraseña actualizada para: ${emailArg}`);
  console.log(`Nueva contraseña: ${plain}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
