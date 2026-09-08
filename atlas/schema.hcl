schema "public" {
  comment = "standard public schema"
}

table "users" {
  schema = schema.public

  column "email" {
    null = false
    type = character_varying(50)
  }
  column "username" {
    null = false
    type = character_varying(40)
  }
  column "created_at" {
    null    = true
    type    = timestamptz
    default = sql("now()")
  }
  column "birthdate" {
    null = false
    type = date
  }
  column "city" {
    null = false
    type = character_varying(30)
  }
  column "updated_at" {
    null = false
    type = timestamptz
    default = sql("now()")
  }
  column "first_name" {
    null = false
    type = character_varying(40)
  }
  column "last_name" {
    null = false
    type = character_varying(40)
  }
  column "password" {
    null = false
    type = character_varying(100)
  }
  column "enabled" {
    null = false
    type = boolean
    default = true
  }
  column "last_access_time" {
    null = true
    type = timestamptz
  }
  primary_key {
    columns = [column.email]
  }
  index "users_username_key" {
    unique  = true
    columns = [column.username]
  }

  check {
    expr = "email LIKE '%@%.%'"
  }

  check "username_length" {
    expr = "(length(username) > 3)"
  }
}
