const express = require('express');
const path = require('path');
const session = require('express-session');
const env = require('./config/env');

const webRoutes = require('./routes/web.routes');
const authApi = require('./routes/auth.api');
const lookupsApi = require('./routes/lookups.api');
const projectsApi = require('./routes/projects.api');
const tasksApi = require('./routes/tasks.api');
const adminApi = require('./routes/admin.api');
const userApi = require('./routes/user.api');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    maxAge: env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000
  }
}));

app.use('/public', express.static(path.join(__dirname, '..', 'public')));

app.use('/', webRoutes);

app.use('/api/auth', authApi);
app.use('/api', lookupsApi);
app.use('/api', projectsApi);
app.use('/api', tasksApi);
app.use('/api', adminApi);
app.use('/api', userApi);

app.use((req, res) => res.status(404).send('404 - No encontrado'));

app.listen(env.PORT, () => {
  console.log(`Todo Simple corriendo en http://localhost:${env.PORT}`);
  console.log(`APP_TZ=${env.APP_TZ}`);
});
