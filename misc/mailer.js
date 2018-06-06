const nodemailer = require('nodemailer');
const config = require('../config/mailer');

const transport = nodemailer.createTransport({
  host: 'mail.planetcar.me',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.user,
    pass: config.pass
  },
  tls: {
    rejectUnauthorized: false
  }
});

module.exports = {
  sendEmail(from, to, subject, html) {
    return new Promise((resolve, reject) => {
      transport.sendMail({
        from,
        to,
        subject,
        html
      }, (err, info) => {
        if (err) reject(err);

        resolve(info);
      });
    });
  }
}