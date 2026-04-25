"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
require("reflect-metadata");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Configure CORS
    app.enableCors({
        origin: '*', // For development, allow all. In production, this should be restricted.
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });
    const port = process.env.PORT || 3001;
    await app.listen(port);
    common_1.Logger.log(`StellarGuard API Server running on: http://localhost:${port}/api`, 'Bootstrap');
}
bootstrap().catch((err) => {
    common_1.Logger.error(`Error starting server: ${err.message}`, 'Bootstrap');
    process.exit(1);
});
//# sourceMappingURL=main.js.map