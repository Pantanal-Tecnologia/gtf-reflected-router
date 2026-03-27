import { UserController } from "../user.controller";
import { users } from "../../lib/users";

describe("UserController", () => {
  let userController: UserController;

  beforeEach(() => {
    userController = new UserController();
  });

  describe("getUsers", () => {
    it("should return all users", async () => {
      const result = await userController.getUsers();

      expect(result).toEqual(users);
      expect(result.length).toBe(2);
      expect(result[0]?.username).toBe("yopl");
      expect(result[1]?.username).toBe("pipfs");
    });
  });

  describe("getUserById", () => {
    it("should return a user when valid ID is provided", async () => {
      const result = await userController.getUserById("12", {} as any);
      expect(result).toEqual(users[0]);
    });

    it("should return 404 message when user is not found", async () => {
      const result = await userController.getUserById("999", {} as any);
      expect(result).toEqual({ message: "User not found" });
    });
  });
});
