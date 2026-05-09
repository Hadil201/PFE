import mongoose, { Connection } from 'mongoose';

export const connect = async (connectionUrl: string): Promise<Connection> => {
  return mongoose.createConnection(connectionUrl);
};
