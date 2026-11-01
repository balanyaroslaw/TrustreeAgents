import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';

// One bus for the whole process: the execution core and the SDK layer emit, and the commands
// subscribe the terminal printer while they run.
@Global()
@Module({
  providers: [EventBus],
  exports: [EventBus],
})
export class EventsModule {}
