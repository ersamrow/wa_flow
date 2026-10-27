import { Global, Module } from "@nestjs/common";
import { ProviderService } from "./provider.service";
import { SignupService } from "./signup.service";
import { IntegrationsController, WebhooksController } from "./providers.controller";
@Global()
@Module({
    providers: [ProviderService, SignupService],
    controllers: [IntegrationsController, WebhooksController],
    exports: [ProviderService]
})
export class ProvidersModule {
}
