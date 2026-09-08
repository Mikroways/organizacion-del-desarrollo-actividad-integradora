const baseFields = [
  {
    name: 'email',
    type: 'character varying',
  },
  {
    name: 'username',
    type: 'character varying',
  },
  {
    name: 'birthdate',
    type: 'date',
  },
  {
    name: 'city',
    type: 'character varying',
  },
  {
    name: 'created_at',
    type: 'timestamp with time zone',
  },
];

const expectedFields = [
  ...baseFields,
  {
    name: 'updated_at',
    type: 'timestamp with time zone',
  },
  {
    name: 'last_access_time',
    type: 'timestamp with time zone',
  },
  {
    name: 'first_name',
    type: 'character varying',
  },
  {
    name: 'last_name',
    type: 'character varying',
  },
  {
    name: 'password',
    type: 'character varying',
  },
  {
    name: 'enabled',
    type: 'boolean',
  },
];

module.exports = {
  baseFields,
  expectedFields,
};
