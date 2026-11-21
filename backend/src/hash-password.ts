import { hashPassword } from "./auth";
const pw = process.argv[2];
if (!pw || pw.length < 12) { console.error('Использование: npm run backend:hash -- "пароль не короче 12 символов"'); process.exit(1); }
console.log("ADMIN_PASSWORD_HASH=" + hashPassword(pw));
