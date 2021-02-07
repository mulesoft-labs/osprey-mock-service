FROM osprey-mock-service:latest

COPY api.raml .

EXPOSE 8080
CMD [ "osprey-mock-service", "-f", "api.raml", "-p", "8080" ]
