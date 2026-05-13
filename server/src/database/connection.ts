import mongoose, { Connection } from "mongoose";

export const connect = async (connectionUrl: string): Promise<Connection> => {
  await mongoose.connect(connectionUrl);
  return mongoose.connection;
};
