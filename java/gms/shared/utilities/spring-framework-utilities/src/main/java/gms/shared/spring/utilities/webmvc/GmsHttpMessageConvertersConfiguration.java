package gms.shared.spring.utilities.webmvc;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;

@Configuration(proxyBeanMethods = false)
public class GmsHttpMessageConvertersConfiguration {

  @Bean
  public MappingJackson2HttpMessageConverter jsonMessageConverter() {
    return new MappingJackson2HttpMessageConverter(MapperFactory.jsonMapper());
  }

  @Bean
  public MessagePackMessageConverter messagePackMessageConverter() {
    return new MessagePackMessageConverter(MapperFactory.messagePackMapper());
  }
}
