import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => this.convertTypes(data)),
    );
  }

  private convertTypes(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // BigInt direct → String
    if (typeof obj === 'bigint') {
      return obj.toString();
    }

    // Date - ne pas modifier
    if (obj instanceof Date) {
      return obj;
    }

    // Decimal Prisma → Number
    // Les Decimal Prisma ont une méthode toNumber() ou sont des objets avec d/s/e
    if (typeof obj === 'object' && obj.constructor && obj.constructor.name === 'Decimal') {
      return obj.toNumber();
    }

    // Autre cas : objet avec méthode toNumber() (Decimal-like)
    if (
      typeof obj === 'object' &&
      typeof obj.toNumber === 'function' &&
      !Array.isArray(obj)
    ) {
      return obj.toNumber();
    }

    // Array
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertTypes(item));
    }

    // Object
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = this.convertTypes(obj[key]);
        }
      }
      return result;
    }

    return obj;
  }
}