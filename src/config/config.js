module.exports = {
    port: process.env.PORT || 3010,
    defaultPassword: process.env.DEFAULT_PASSWORD || '123',
    jwtSecret: process.env.JWT_SECRET || 'cursor-to-openai-secret-key',
    sessionSecret: process.env.SESSION_SECRET || 'cursor-to-openai-session-secret'
};
