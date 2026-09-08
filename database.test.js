const { Client } = require('pg');
const {
  /**
   * Recuperamos el esquema esperado
   *
   * Para una primer etapa, se recomienda importar la propiedad
   * "baseFields" reenombrandola a "expectedFields"
   */
  baseFields: expectedFields,
} = require('./schema_base');

describe('Test database', () => {
  /**
   * Variables globales usadas por diferentes tests
   */
  let client;

  /**
   * Generamos la configuracion con la base de datos y
   * hacemos la consulta sobre los datos de la tabla "users"
   *
   * Se hace en la etapa beforeAll para evitar relizar la operación
   * en cada test
   */
  beforeAll(async () => {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
  });

  /**
   * Cerramos la conexion con la base de datos
   */
  afterAll(async () => {
    await client.end();
  });

  /**
   * Validamos el esquema de la base de datos
   */
  describe('Validate database schema', () => {
    /**
     * Variable donde vamos a almacenar los campos
     * recuperados de la base de datos
     */
    let fields;
    let result;

    /**
     * Generamos un objeto para simplificar el acceso en los test
     */
    beforeAll(async () => {
      /**
       * Consulta para recuperar la información de la tabla
       * "users"
       */
      result = await client.query(
        `SELECT
          column_name, data_type
        FROM
          information_schema.columns
        WHERE
          table_name = $1::text`,
        ['users'],
      );

      fields = result.rows.reduce((acc, field) => {
        acc[field.column_name] = field.data_type;
        return acc;
      }, {});
    });

    describe('Validate fields name', () => {
      /**
       * Conjunto de tests para validar que los campos esperados se
       * encuentren presentes
       */
      test.each(expectedFields)('Validate field $name', ({ name }) => {
        expect(Object.keys(fields)).toContain(name);
      });
    });

    describe('Validate fields type', () => {
      /**
       * Conjunto de tests para validar que los campos esperados sean
       * del tipo esperado
       */
      test.each(expectedFields)('Validate field $name to be type "$type"', ({ name, type }) => {
        expect(fields[name]).toBe(type);
      });
    });
  });

  describe('Validate insertion', () => {
    afterEach(async () => {
      await client.query('TRUNCATE users');
    });

    test('Insert a valid user', async () => {
      let result = await client.query(
        `INSERT INTO
         users (email, username, birthdate, city)
         VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata')`,
      );

      expect(result.rowCount).toBe(1);

      result = await client.query(
        'SELECT * FROM users',
      );

      const user = result.rows[0];
      const userCreatedAt = new Date(user.created_at);
      const currentDate = new Date();

      expect(user.email).toBe('user@example.com');
      expect(userCreatedAt.getFullYear()).toBe(currentDate.getFullYear());
    });

    test('Insert a user with an invalid email', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user', 'user', '2024-01-02', 'La Plata')`;

      await expect(client.query(query)).rejects.toThrow('users_email_check');
    });

    test('Insert a user with an invalid birthdate', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city)
                     VALUES ('user@example.com', 'user', 'invalid_date', 'La Plata')`;

      await expect(client.query(query)).rejects.toThrow('invalid input syntax for type date');
    });

    test('Insert a user without city', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate)
                     VALUES ('user@example.com', 'user', '2024-01-02')`;

      await expect(client.query(query)).rejects.toThrow('null value in column "city"');
    });
  });
});
