import { Global, Module } from '@nestjs/common';
import { EventBus } from './event-bus';

// One bus for the whole process: the execution core emits, the terminal and the database logger
// subscribe.
@Global()
@Module({
  providers: [EventBus],
  exports: [EventBus],
})
export class EventsModule {}
