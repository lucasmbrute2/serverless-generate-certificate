import { APIGatewayProxyHandler } from "aws-lambda"
import { document } from "../utils/dynamobdbClient"
import * as handlebars from "handlebars"
import { join } from "path"
import { readFileSync } from "fs"
import dayjs from "dayjs"
//@ts-ignore
import * as chromium from "chrome-aws-lambda"
import { S3 } from "aws-sdk"

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
  const filePath = join(process.cwd(), "src", "templates", "certificate.hbs");
  const html = readFileSync(filePath, "utf-8");

  return handlebars.compile(html)(data)
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id, name, grade } = JSON.parse(event.body) as ICreateCertificate;
  const TableName = 'users_certificate';

  const response = await document.query({
    TableName,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()

  const haveSomeCertificate = response.Items[0];

  if (!haveSomeCertificate) {
    await document.put({
      TableName,
      Item: {
        id,
        name,
        grade,
        created_at: new Date().getTime()
      }
    }).promise()
  }

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
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
  })

  const page = await browser.newPage()
  await page.setContent(content)
  const pdf = await page.pdf({
    format: "a4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? "./certificate.pdf" : null
  })

  await browser.close()

  const s3 = new S3();

  await s3.putObject({
    Bucket: "certificate-nodejs-ignite-soruz",
    Key: `${id}.pdf`,
    Body: pdf,
    ContentType: "application/pdf",
    ACL: "public-read"
  }).promise()

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Certificado criado com sucesso!",
      url: `https://certificate-nodejs-ignite-soruz.s3.amazonaws.com/${id}.pdf`,
      payload: response.Items[0]

    })
  }
}