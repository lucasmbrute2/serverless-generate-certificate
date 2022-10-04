import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamobdbClient";

interface IUserCertificate {
  name: string;
  id: string;
  created_at: string;
  grade: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id } = event.pathParameters;
  const TableName = 'users_certificate';

  const response = await document.query({
    TableName,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": id
    }
  }).promise()

  const usersCertificate = response.Items[0] as IUserCertificate;

  if (usersCertificate) {
    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Certificado válido.",
        name: usersCertificate.name,
        url: `https://certificate-nodejs-ignite-soruz.s3.amazonaws.com/${id}.pdf`
      })
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Certificado inválido"
    })
  }

}