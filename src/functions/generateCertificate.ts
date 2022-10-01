import { APIGatewayProxyHandler } from "aws-lambda"
import { document } from "../utils/dynamobdbClient"
import * as handlebars from "handlebars"
import { join } from "path"
import { readFileSync } from "fs"
import * as dayjs from "dayjs"


interface ICreateCertificate {
  id: string;
  name: string;
  grade: string
}

interface ITemplate extends ICreateCertificate {
  medal?: string;
  date?: string;
}

const compile = async (data: ITemplate) => {
  const filePath = join(process.cwd(), "src", "templates", "certificates.hbs");
  const html = readFileSync(filePath, "utf-8");

  return handlebars.compile(html)(data)
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate;
  const TableName = 'users_certificate';

  await document.put({
    TableName,
    Item: {
      id,
      name,
      grade,
      created_at: new Date().getTime()
    }
  }).promise()

  const response = await document.query({
    TableName,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()

  const medalPath = join(process.cwd(), "src", "templates", "selo.png")
  const medal = readFileSync(medalPath, "base64")

  const data: ITemplate = {
    name,
    id,
    grade,
    date: dayjs().format("DD/MM/YYYY"),
    medal
  }

  const content = await compile(data)

  return {
    statusCode: 201,
    body: JSON.stringify(response.Items[0])
  }
}