import { Injectable } from "gtf-reflected-router";
import { users } from "../../common/users.data";

@Injectable()
export class UsersService {
  private usersList = [...users];

  async findAll() {
    return this.usersList;
  }

  async findById(id: number) {
    return this.usersList.find((u) => u.id === id);
  }

  async create(userData: { username: string; level: number; tag: string }) {
    const newUser = {
      id: this.usersList.length + 1,
      ...userData,
    };
    this.usersList.push(newUser);
    return newUser;
  }

  async remove(id: number) {
    const index = this.usersList.findIndex((u) => u.id === id);
    if (index !== -1) {
      const removed = this.usersList.splice(index, 1);
      return removed[0];
    }
    return null;
  }
}
