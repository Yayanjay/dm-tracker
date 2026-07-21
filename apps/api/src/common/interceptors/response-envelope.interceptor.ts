import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const response = http.getResponse();

    return next.handle().pipe(
      map((body) => {
        if (body && typeof body === "object" && "code" in body && "message" in body) {
          return body;
        }

        const statusCode = response.statusCode;

        if (body && body.data !== undefined && body.pagination !== undefined) {
          return {
            code: statusCode,
            message: "Success",
            data: body.data,
            pagination: body.pagination,
          };
        }

        if (body && body.data !== undefined) {
          return {
            code: statusCode,
            message: "Success",
            data: body.data,
          };
        }

        return {
          code: statusCode,
          message: "Success",
          data: body ?? null,
        };
      }),
    );
  }
}
