const { Client } = require('pg');
const { expectedFields } = require('./schema_base');

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

    /**
     * Insertamos un usuario con todos los campos obligatorios y
     * validamos los valores por defecto de las columnas con default
     */
    test('Insert a valid user', async () => {
      let result = await client.query(
        `INSERT INTO
         users (email, username, birthdate, city, first_name, last_name, password)
         VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', 'Juan', 'Perez', 'secret-password')`,
      );

      expect(result.rowCount).toBe(1);

      result = await client.query(
        'SELECT * FROM users',
      );

      const user = result.rows[0];
      const userCreatedAt = new Date(user.created_at);
      const userUpdatedAt = new Date(user.updated_at);
      const currentDate = new Date();

      expect(user.email).toBe('user@example.com');
      expect(user.first_name).toBe('Juan');
      expect(user.last_name).toBe('Perez');
      expect(user.password).toBe('secret-password');
      expect(user.enabled).toBe(true);
      expect(user.last_access_time).toBeNull();
      expect(userCreatedAt.getFullYear()).toBe(currentDate.getFullYear());
      expect(userUpdatedAt.getFullYear()).toBe(currentDate.getFullYear());
    });

    test('Insert a user with an invalid email', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city, first_name, last_name, password)
                     VALUES ('user', 'user', '2024-01-02', 'La Plata', 'Juan', 'Perez', 'secret-password')`;

      await expect(client.query(query)).rejects.toThrow('users_email_check');
    });

    test('Insert a user with an invalid birthdate', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, city, first_name, last_name, password)
                     VALUES ('user@example.com', 'user', 'invalid_date', 'La Plata', 'Juan', 'Perez', 'secret-password')`;

      await expect(client.query(query)).rejects.toThrow('invalid input syntax for type date');
    });

    test('Insert a user without city', async () => {
      const query = `INSERT INTO
                     users (email, username, birthdate, first_name, last_name, password)
                     VALUES ('user@example.com', 'user', '2024-01-02', 'Juan', 'Perez', 'secret-password')`;

      await expect(client.query(query)).rejects.toThrow('null value in column "city"');
    });

    /**
     * Casos límite para cada una de las columnas agregadas al esquema
     */
    describe('Validate new fields boundaries', () => {
      test('Insert a user with a first_name too long', async () => {
        const query = `INSERT INTO
                       users (email, username, birthdate, city, first_name, last_name, password)
                       VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', '${'a'.repeat(41)}', 'Perez', 'secret-password')`;

        await expect(client.query(query)).rejects.toThrow('value too long for type character varying(40)');
      });

      test('Insert a user without last_name', async () => {
        const query = `INSERT INTO
                       users (email, username, birthdate, city, first_name, password)
                       VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', 'Juan', 'secret-password')`;

        await expect(client.query(query)).rejects.toThrow('null value in column "last_name"');
      });

      test('Insert a user without password', async () => {
        const query = `INSERT INTO
                       users (email, username, birthdate, city, first_name, last_name)
                       VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', 'Juan', 'Perez')`;

        await expect(client.query(query)).rejects.toThrow('null value in column "password"');
      });

      test('Insert a user with an invalid enabled', async () => {
        const query = `INSERT INTO
                       users (email, username, birthdate, city, first_name, last_name, password, enabled)
                       VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', 'Juan', 'Perez', 'secret-password', 'maybe')`;

        await expect(client.query(query)).rejects.toThrow('invalid input syntax for type boolean');
      });

      test('Insert a user with an invalid updated_at', async () => {
        const query = `INSERT INTO
                       users (email, username, birthdate, city, first_name, last_name, password, updated_at)
                       VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', 'Juan', 'Perez', 'secret-password', 'not-a-date')`;

        await expect(client.query(query)).rejects.toThrow('invalid input syntax for type timestamp');
      });

      test('Insert a user with an invalid last_access_time', async () => {
        const query = `INSERT INTO
                       users (email, username, birthdate, city, first_name, last_name, password, last_access_time)
                       VALUES ('user@example.com', 'user', '2024-01-02', 'La Plata', 'Juan', 'Perez', 'secret-password', 'not-a-date')`;

        await expect(client.query(query)).rejects.toThrow('invalid input syntax for type timestamp');
      });
    });
  });
});
