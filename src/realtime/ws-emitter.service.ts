import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

// @Injectable()
// export class WsEmitterService {
//   private io?: Server;
//   private readonly log = new Logger(WsEmitterService.name);

//   setServer(io: Server) {
//     this.io = io;
//     this.log.log('Socket.IO server registered');
//   }

//   toUser(userId: string, event: string, payload: any) {
//     this.io?.to(`user:${userId}`).emit(event, payload);
//   }
// }


@Injectable()
export class WsEmitterService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  toRoom(room: string, event: string, payload: any) {
    console.log("MyRoomWOrk===")
    if (!this.server) return;
    console.log("after MyRoomWOrk===")
    this.server.to(room).emit(event, payload);
  }

  toUser(userId: string, event: string, payload: any) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}