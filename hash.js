import bcrypt from "bcrypt";

const run = async () => {
  const password = "SuperAdmin@123";
  const hash = await bcrypt.hash(password, 10);
  console.log("Password:", password);
  console.log("Hash:", hash);
};

run();
