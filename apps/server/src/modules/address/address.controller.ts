import { Injectable, Controller, Get, Param } from "gtf-reflected-router";

@Injectable()
@Controller("/address")
export class AddressController {
  @Get("/:id", {
    schema: {
      tags: ["address"],
    },
  })
  async getAddress(@Param("id") id: string): Promise<string> {
    return `Address ${id}`;
  }
}
