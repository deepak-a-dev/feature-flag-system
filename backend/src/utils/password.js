const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

// Hash a plaintext password before storing. 
function hashPassword(plainText) {
  return bcrypt.hashSync(plainText, SALT_ROUNDS);
}

// Compare a login password against stored hash. Returns true/false
function verifyPassword(plainText, hash) {
  return bcrypt.compareSync(plainText, hash);
}

module.exports = { hashPassword, verifyPassword };