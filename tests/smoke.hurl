GET {{base_url}}/
HTTP 200

GET {{base_url}}/api/health
HTTP 200

GET {{base_url}}/api/version
HTTP 200

GET {{base_url}}/api/users/u42
HTTP 200

GET {{base_url}}/docs/readme
HTTP 200

GET {{base_url}}/assets/css/style.css
HTTP 200

GET {{base_url}}/api/config
HTTP 200
[Asserts]
jsonpath "$.server.ssl.key" not exists
jsonpath "$.server.ssl.cert" not exists

GET {{base_url}}/missing
HTTP 404

GET {{base_url}}/%ZZ
HTTP 400

GET {{base_url}}/api/chat/ws
HTTP 426

POST {{base_url}}/api/validate/form
HTTP 400

POST {{base_url}}/api/validate/zod
HTTP 400

POST {{base_url}}/api/validate/zod
[FormParams]
email: review@example.test
number: 33611223344
HTTP 200

POST {{base_url}}/api/upload
[MultipartFormData]
file: file,random_file; application/octet-stream
HTTP 200
[Asserts]
jsonpath "$.success" == true
jsonpath "$.fileName" not contains ".."
jsonpath "$.fileName" not contains "/"
