export const generateRoomId = (length = 8) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < length; i += 1) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};
