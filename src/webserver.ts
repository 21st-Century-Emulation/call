/**
 * webserver.ts
 */
import { Application, Context, Router } from "./deps.ts";

const app = new Application();
const router = new Router();

const WRITE_MEMORY_API = Deno.env.get("WRITE_MEMORY_API");

router.get("/status", (context: Context) => {
  context.response.body = "Healthy";
});

router.post("/api/v1/debug/writeMemory", (context: Context) => {
  const address = context.request.url.searchParams.get("address");
  const value = context.request.url.searchParams.get("value");

  console.log("Writing " + address + "=" + value);
});

router.post("/api/v1/execute", async (context: Context) => {
  const result = context.request.body();
  const value = await result.value;

  const addressHighByteStr = context.request.url.searchParams.get("operand2");
  const addressLowByteStr = context.request.url.searchParams.get("operand1");
  if (addressHighByteStr == null || addressLowByteStr == null) {
    context.response.body = "Missing query string high byte and low byte";
    context.response.status = 400;
    return;
  }
  const address = (parseInt(addressHighByteStr, 10) << 8) | parseInt(addressLowByteStr, 10);

  let flag = true;
  switch (value["opcode"]) {
    case 0xC4: // CNZ
      flag = !value["state"]["flags"]["zero"];
      break;
    case 0xCC: // CZ
      flag = value["state"]["flags"]["zero"];
      break;
    case 0xD4: // CNC
      flag = !value["state"]["flags"]["carry"];
      break;
    case 0xDC: // CC
      flag = value["state"]["flags"]["carry"];
      break;
    case 0xE4: // CPO
      flag = !value["state"]["flags"]["parity"];
      break;
    case 0xEC: // CPE
      flag = value["state"]["flags"]["parity"];
      break;
    case 0xF4: // CP
      flag = !value["state"]["flags"]["sign"];
      break;
    case 0xFC: // CM
      flag = value["state"]["flags"]["sign"];
      break;
    case 0xCD: //CALL
      flag = true;
      break;
    case 0xDD: //CALL
      flag = true;
      break;
    case 0xED: //CALL
      flag = true;
      break;
    case 0xFD: //CALL
      flag = true;
      break;
    default:
      context.response.status = 400;
      context.response.body = "Invalid opcode";
      return;
  }
  
  if (!flag) {
    value["state"]["cycles"] += 11; // 11 cycles for flag rejected call
  } else {
    value["state"]["cycles"] += 17; // 17 cycles for performed call

    // Push PC high byte
    value["state"]["stackPointer"] = (value["state"]["stackPointer"] - 1) & 0xFFFF;
    const highBytePush = fetch(`${WRITE_MEMORY_API}?id=${value["id"]}&address=${value["state"]["stackPointer"]}&value=${value["state"]["programCounter"] >> 8}`);

    // Push PC low byte
    value["state"]["stackPointer"] = (value["state"]["stackPointer"] - 1) & 0xFFFF;
    const lowBytePush = fetch(`${WRITE_MEMORY_API}?id=${value["id"]}&address=${value["state"]["stackPointer"]}&value=${value["state"]["programCounter"] & 0xFF}`);

    await Promise.all([highBytePush, lowBytePush]);

    value["state"]["programCounter"] = address;
  }

  context.response.status = 200;
  context.response.type = "application/json";
  context.response.body = JSON.stringify(value);
});

app.use(router.routes());

await app.listen("0.0.0.0:8080");