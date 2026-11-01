import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { EnvironmentFile } from './config/environment-file';

async function bootstrap() {
  EnvironmentFile.load();
  await CommandFactory.run(AppModule, ['warn', 'error']);
}
bootstrap();
