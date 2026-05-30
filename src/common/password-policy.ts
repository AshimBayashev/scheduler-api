import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Пароль: не менее 8 символов, хотя бы одна буква и одна цифра';

const HAS_LETTER = /[A-Za-zА-Яа-яЁё]/;
const HAS_DIGIT = /\d/;

export function isStrongPassword(value: string): boolean {
  return (
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH &&
    HAS_LETTER.test(value) &&
    HAS_DIGIT.test(value)
  );
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isStrongPassword(value);
        },
        defaultMessage(_args: ValidationArguments) {
          return PASSWORD_REQUIREMENTS_MESSAGE;
        },
      },
    });
  };
}
