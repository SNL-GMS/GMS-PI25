package gms.shared.frameworks.configuration.repository.dao;

import gms.shared.frameworks.configuration.Operator.Type;
import io.hypersistence.utils.hibernate.type.basic.PostgreSQLEnumType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.util.Objects;

@Embeddable
public class OperatorDao {

  @Enumerated(EnumType.STRING)
  @Column(name = "operator_type", columnDefinition = "operator_type_enum", nullable = false)
  @org.hibernate.annotations.Type(PostgreSQLEnumType.class)
  private Type type;

  @Column(name = "negated", nullable = false)
  private boolean negated;

  public OperatorDao() {
    // Empty JPA Constructor
  }

  public Type getType() {
    return this.type;
  }

  public void setType(Type type) {
    this.type = type;
  }

  public boolean isNegated() {
    return this.negated;
  }

  public void setNegated(boolean negated) {
    this.negated = negated;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) {
      return true;
    }
    if (o == null || this.getClass() != o.getClass()) {
      return false;
    }
    OperatorDao that = (OperatorDao) o;
    return this.negated == that.negated && this.type == that.type;
  }

  @Override
  public int hashCode() {
    return Objects.hash(this.type, this.negated);
  }
}
