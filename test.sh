docker build -q -t call .
docker run --rm --name call -d -p 8080:8080 -e WRITE_MEMORY_API=http://localhost:8080/api/v1/debug/writeMemory call

sleep 5
RESULT=`curl -s --header "Content-Type: application/json" \
  --request POST \
  --data '{"opcode":196,"state":{"a":181,"b":0,"c":0,"d":0,"e":0,"h":25,"l":10,"flags":{"sign":false,"zero":false,"auxCarry":false,"parity":false,"carry":false},"programCounter":0,"stackPointer":0,"cycles":0}}' \
  http://localhost:8080/api/v1/execute\?operand2=10\&operand1=7`
EXPECTED='{"opcode":196,"state":{"a":181,"b":0,"c":0,"d":0,"e":0,"h":25,"l":10,"flags":{"sign":false,"zero":false,"auxCarry":false,"parity":false,"carry":false},"programCounter":2567,"stackPointer":65533,"cycles":17}}'

docker kill call

DIFF=`diff <(jq -S . <<< "$RESULT") <(jq -S . <<< "$EXPECTED")`

if [ $? -eq 0 ]; then
    echo -e "\e[32mCALL Test Pass \e[0m"
    exit 0
else
    echo -e "\e[31mCALL Test Fail  \e[0m"
    echo "$RESULT"
    echo "$DIFF"
    exit -1
fi